// Defaults on install/update
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get({ autoClean: false }, (s) => {
    if (typeof s.autoClean !== "boolean") {
      chrome.storage.sync.set({ autoClean: false });
    }
  });

  chrome.contextMenus.create({
    id: "copyclean-plain",
    title: "Copy selection as plain text",
    contexts: ["selection"]
  });
});

// Context menu -> ask content script to copy, fallback to executeScript
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "copyclean-plain" || !tab?.id) return;
  try {
    await sendMessageToTab(tab.id, { type: "COPY_PLAIN" });
  } catch {
    await fallbackExecutePlainCopy(tab.id);
  }
});

// Messages from popup for manual copy or simple probes
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === "POPUP_COPY") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return sendResponse({ ok: false, error: "No active tab." });

      try {
        await sendMessageToTab(tab.id, { type: "COPY_PLAIN" });
        sendResponse({ ok: true });
      } catch {
        await fallbackExecutePlainCopy(tab.id);
        sendResponse({ ok: true, fallback: true });
      }
    }
  })();
  return true; // async
});

// Utility: message to a tab (rejects if no receiver)
function sendMessageToTab(tabId, payload) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, payload, (res) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      if (res?.ok) return resolve(res);
      reject(res?.error || new Error("No response"));
    });
  });
}

// Fallback: run in page via executeScript (inherits user gesture from menu/popup click)
async function fallbackExecutePlainCopy(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      func: () => {
        const sel = window.getSelection && window.getSelection();
        const text = sel && !sel.isCollapsed ? String(sel) : "";
        if (!text) return false;
        // Prefer navigator.clipboard if allowed, else fallback to execCommand
        const write = async () => {
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(text);
              return true;
            }
          } catch {}
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          ta.style.pointerEvents = "none";
          document.body.appendChild(ta);
          ta.select();
          try {
            const ok = document.execCommand("copy");
            document.body.removeChild(ta);
            return ok;
          } catch {
            document.body.removeChild(ta);
            return false;
          }
        };
        return write();
      }
    });
    // Ask content to show toast if possible
    try { await sendMessageToTab(tabId, { type: "TOAST", text: "Copied as plain text" }); } catch {}
  } catch (e) {
    // Nothing we can do on restricted pages
  }
}
