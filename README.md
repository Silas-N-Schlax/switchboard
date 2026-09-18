# Switchboard

A minimal, keyboard-first Chrome New Tab replacement. Named tabs (workspaces) of links,
local-only storage (no cloud, no sync), and a search bar that doubles as a link-jump and
a Google search fallback.

## Status

Pass 1: project skeleton. Loads as a blank new tab page — storage/schema/seed logic
works, UI rendering is stubbed out.

## Load it as the extension

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this folder.
4. Open a new tab.

No build step — the repo root is the extension. After editing files, click the reload
icon on `chrome://extensions` (only needed for `manifest.json`/`background.js` changes —
HTML/CSS/JS is usually picked up by just opening a new tab).

## Or just open it in a browser tab

For quick UI iteration without touching `chrome://extensions`, `js/storage.js` falls back
to `localStorage` whenever `chrome.storage` isn't available. Serve the folder with any
static server and open `newtab.html`:

```
npx serve .
# or: python3 -m http.server
```

Opening `newtab.html` directly via `file://` won't work — `fetch()` of `defaults.json` is
blocked by CORS on the `file://` protocol in most browsers, so a local server is required
either way.
