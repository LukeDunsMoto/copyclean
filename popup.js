const autoToggle = document.getElementById("autoToggle");
const copyBtn = document.getElementById("copyBtn");
const blockedBanner = document.getElementById("blocked");

(async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || "";

  const blockedReason = getBlockedReason(url);
  if (blockedReason) {
    blockedBanner.textContent = blockedReason;
    blockedBanner.classList.remove("hidden");
    autoToggle.disabled = true;
    copyBtn.disabled = true;
  }

  chrome.storage.sync.get({ autoClean: false }, (s) => {
    autoToggle.checked = !!s.autoClean;
  });

  autoToggle.addEventListener("change", async () => {
    await chrome.storage.sync.set({ autoClean: autoToggle.checked });
  });

  copyBtn.addEventListener("click", async () => {
    try {
      const resp = await chrome.runtime.sendMessage({ type: "POPUP_COPY" });
      if (!resp?.ok) throw new Error(resp?.error || "Copy failed");
      // Success toast will be shown by content script; if fallback ran, we already nudged it too.
      window.close();
    } catch (e) {
      copyBtn.textContent = "Copy failed";
      setTimeout(() => (copyBtn.textContent = "Copy selection as plain text"), 900);
    }
  });
})();

// Detect restricted pages we cannot script
function getBlockedReason(url) {
  try {
    const u = new URL(url);
    const isChromePage = u.protocol === "chrome:" || u.protocol === "edge:" || u.protocol === "about:";
    const isWebStore = u.hostname === "chrome.google.com" && u.pathname.startsWith("/webstore");
    const looksPdf = u.pathname.toLowerCase().endsWith(".pdf");
    if (isChromePage) return "This page is restricted (chrome://). copyclean is disabled.";
    if (isWebStore) return "Chrome Web Store is restricted. copyclean is disabled.";
    if (looksPdf) return "Direct PDF viewer is restricted. copyclean is disabled.";
  } catch {}
  return null;
}
