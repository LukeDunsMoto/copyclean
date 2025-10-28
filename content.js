// State
let autoClean = false;
let toastTimer = null;

// Init: get setting and subscribe to changes
chrome.storage.sync.get({ autoClean: false }, (s) => { autoClean = !!s.autoClean; });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.autoClean) autoClean = !!changes.autoClean.newValue;
});

// Key handler: intercept Ctrl/Cmd+C if enabled and selection exists
addEventListener("keydown", async (e) => {
  try {
    if (!autoClean) return;
    // Ctrl (Windows/Linux/ChromeOS) or Meta (macOS)
    const ctrlOrMeta = e.ctrlKey || e.metaKey;
    if (!ctrlOrMeta) return;
    if (e.key !== "c" && e.key !== "C") return;

    const sel = getSelection();
    if (!sel || sel.isCollapsed) return;

    // Avoid breaking inputs where user expects rich copy? We still plain-copy per feature spec.
    e.preventDefault();
    e.stopPropagation();

    const ok = await copyPlainSelection();
    showTinyToast(ok ? "Copied as plain text" : "Copy failed");
  } catch {
    // As a fallback, ask background to inject a page-copy function
    try {
      chrome.runtime.sendMessage({ type: "REQUEST_FALLBACK" });
    } catch {}
  }
}, true);

// Handle messages from popup/background
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "COPY_PLAIN") {
      const ok = await copyPlainSelection();
      showTinyToast(ok ? "Copied as plain text" : "Nothing selected");
      sendResponse({ ok });
    } else if (msg?.type === "TOAST") {
      showTinyToast(msg.text || "Done");
      sendResponse({ ok: true });
    }
  })();
  return true;
});

// Core: copy the current selection as plain text
async function copyPlainSelection() {
  try {
    const sel = getSelection && getSelection();
    const text = sel && !sel.isCollapsed ? String(sel) : "";
    if (!text) return false;

    // Best path: async clipboard
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Legacy fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    Object.assign(ta.style, {
      position: "fixed",
      top: "-9999px",
      left: "-9999px",
      opacity: "0",
      pointerEvents: "none"
    });
    document.documentElement.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

// UI: minimal toast
function showTinyToast(message) {
  try {
    const id = "__copyclean_toast__";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      Object.assign(el.style, {
        position: "fixed",
        zIndex: "2147483647",
        bottom: "16px",
        right: "16px",
        maxWidth: "60ch",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        fontSize: "12px",
        lineHeight: "1",
        padding: "8px 10px",
        borderRadius: "6px",
        background: "rgba(0,0,0,0.82)",
        color: "#fff",
        boxShadow: "0 3px 12px rgba(0,0,0,0.3)",
        transition: "opacity .15s ease, transform .15s ease",
        opacity: "0",
        transform: "translateY(6px)"
      });
      document.documentElement.appendChild(el);
      requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      });
    }
    el.textContent = message || "Done";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (!el) return;
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      setTimeout(() => el && el.remove(), 180);
    }, 1100);
  } catch {}
}
