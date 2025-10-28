![Copyclean Icon](https://www.lukedunsmore.com/wp-content/uploads/2025/10/CopyClean-Icon.png)

# copyclean
Copy text **without the formatting nonsense**.

Auto-clean on **Ctrl / Cmd + C** or use the popup button to copy any selection as **plain text**.

Built for Manifest V3 — simple, reliable, and blessedly drama-free. Privacy-first, local storage only.

## Features

- **Auto-clean toggle** — intercepts Ctrl / Cmd + C and cleans copied text automatically.
- **Popup button** — one-click “Copy selection as plain text”.
- **Robust fallbacks** using `chrome.scripting.executeScript` if the content script can’t run.
- **Tiny toast confirmations** so you know it worked.
- **Blocked-page detection** for `chrome://`, the Chrome Web Store, and PDFs.

## Tech Notes

- Uses chrome.storage.sync to persist settings.
- Toasts are rendered directly into the active page DOM for reliability.
- Background worker handles all fallbacks and cross-context messaging.
- Lightweight, zero dependencies.
