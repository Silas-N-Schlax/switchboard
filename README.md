# Switchboard

A calm, keyboard-first New Tab page for Chromium browsers (Chrome, Brave, Edge, Vivaldi).
It replaces the bookmark bar with named tabs of links. Everything is stored locally in
your browser: no account, no cloud sync, no tracking.

> Switchboard is in early testing. Expect rough edges, and please
> [report bugs or ideas](#feedback).

## What it does

- **Tabs of links.** Up to nine named tabs, each with its own list of links. Drag to
  reorder, right-click for more options.
- **Link groups.** Split a busy tab into named groups shown side by side. Right-click a
  link and choose **Move to new group**, or drag links between groups.
- **Moving things around.** Right-click a link or a group's name and choose **Move…** to
  send it to another tab, a different group, or a new group, and pick where it lands.
- **Search.** Press `s` to filter every link across every tab. Use the arrow keys to pick
  a result and Enter to open it. If nothing matches, Enter searches the web with the
  engine you pick (Google, DuckDuckGo, Bing, Kagi, or Brave Search).
- **Keyboard first.** New tabs take focus away from the address bar so shortcuts work
  right away, though the address bar then shows the extension's own URL. You can turn
  this off, or have the search bar focused on open, in Settings → General.
- **Shortcuts.** `1`–`9` switch tabs, and any link can get its own shortcut (including
  modifier combos). Every app shortcut can be changed, cleared, or added in
  Settings → Keybinds → **Customize shortcuts**, including actions that start without a
  key (duplicate or delete a tab, duplicate a link, move it to a new group, and more).
  The keycap hints on tabs, links, the search bar and menus can be turned off there too.
  If a new Switchboard key takes over a link's shortcut, you get a one-time notice
  naming the link.
- **Launch groups.** Pick a few links on a tab and open them all at once with `l`.
- **Ambient background.** Slowly drifting colors, presets and custom palettes, plus a
  choice of scene: rising bubbles, an ocean, a mountain lake, the stratosphere above it,
  or a bouncing screensaver logo. Each scene has its own sliders and toggles, and most
  hide a rare sighting or two. Import more palettes from a palette file (JSON, a
  `.hex`/`.txt` list of hex colors, or a GIMP `.gpl`) in Settings → Background, and
  remove any file again from the list there. Respects your system's reduced-motion
  setting.
- **Fun stats.** Optionally records link opens, searches, tab use and Bounce corner
  hits, locally, for recaps to come.
- **Bookmarks in and out.** Settings → Data → **Browser bookmarks**. Import reads this
  browser's bookmarks directly, or a bookmarks file exported from any other browser.
  Each folder can go to its own tab (or a new one you name) and become a link group.
  Export writes your tabs into this browser's bookmarks, where sync can carry them to
  your phone, or downloads a bookmarks file for another browser. Each tab and link group
  can get its own folder.
- **Link health check.** Optionally checks your links once a day and marks the ones that
  no longer load. It never deletes anything.
- **Backups.** Settings → Data → **Switchboard backup** exports everything to a JSON file.
  Importing one on another machine replaces what's there.
- **Clearing.** Empty one tab (right-click it → **Clear links…**) or reset everything
  (Settings → Data → **Clear everything**). Both ask you to type a phrase first, because
  neither can be undone.

## Install

Switchboard isn't in a store yet, so you load it as an unpacked extension.

1. Clone the repo somewhere permanent (your browser loads it from this folder):
   ```
   git clone https://github.com/Silas-N-Schlax/switchboard.git
   ```
2. Open your browser's extensions page: `brave://extensions`, `chrome://extensions`,
   or `edge://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the `switchboard` folder.
5. Open a new tab. If the browser asks whether to keep the extension's new tab page,
   choose **Keep**.

### Updating

```
cd switchboard
git pull
```

Then click the reload icon on Switchboard in the extensions page. Your tabs, links, and
settings are kept.

### Brave notes

- Changing Brave's theme can switch the extension off. If your new tab goes back to
  Brave's default, re-enable Switchboard on `brave://extensions`.
- Brave's own new-tab settings (background images, widgets) stop applying while
  Switchboard is on.

## Keyboard shortcuts

These are the defaults. Change any of them in Settings → Keybinds → **Customize
shortcuts**; press `/` to see the keys currently in effect.

| Key | Action |
| --- | --- |
| `1`–`9` | Switch tabs |
| `[` / `]` | Previous / next tab |
| `s` | Go to the home tab and search |
| `↑` / `↓` | Move through search results or links |
| `←` / `→` | Move between the main list and link groups |
| `Enter` | Open the selected result or link |
| `Tab` / `Shift+Tab` | Move between links |
| `n` | Add a link to this tab |
| `t` | Add a tab |
| `Shift+R` | Rename this tab |
| `e` | Edit the selected link |
| `⌘+Backspace` (`Ctrl+Backspace` on Windows/Linux) | Delete the selected link |
| `Shift+C` | Copy the selected link's URL |
| `⌘+Enter` (`Ctrl+Enter` on Windows/Linux) | Open the selected link in a new tab |
| `Alt+↑` / `Alt+↓` (`⌥` on Mac) | Move the selected link up or down |
| `l` | Open this tab's launch group |
| `Shift+L` | Edit the launch group |
| `m` | Open the right-click menu for the selected link, tab or group (`↑`/`↓` to pick, `Enter` to run) |
| `,` | Settings |
| `/` | Show all shortcuts |
| `Esc` | Close whatever is open |

## Privacy

Your tabs, links, settings, and usage stats live in your browser's local extension
storage and never leave your machine unless you export a backup yourself. Favicons come
from the browser's own icon cache. The optional history permission (Settings → Links →
Find icons in your history) is only used locally to find icons for links you've saved.

- **Bookmarks:** Switchboard only reads or writes your browser's bookmarks when you run
  an import or export.
- **Link health check (off by default):** turning it on asks for access to all sites.
  That access is only used to request each saved link directly from your browser, to
  see whether it still loads. Local network addresses are skipped.

## Feedback

- Bugs and feature requests: [open an issue](https://github.com/Silas-N-Schlax/switchboard/issues)
- Quick thoughts: the **Send feedback** link at the bottom of Settings, or
  [this form](https://forms.gle/23ozsD4amrUqTjGe7)

When reporting a bug, it helps to include your browser and version, and what you
expected versus what happened.

## Development

There's no build step: the repo root is the extension. After editing, open a new tab to
see HTML/CSS/JS changes. Changes to `manifest.json` or `background.js` need the reload
icon on the extensions page.

For quick UI work outside the extension, `js/storage.js` falls back to `localStorage`
when `chrome.storage` isn't available. Serve the folder and open `switchboard.html`:

```
npx serve .
# or: python3 -m http.server
```

Opening `switchboard.html` over `file://` won't work, because browsers block ES modules there.

To build a zip for sharing without git, run `./scripts/package.sh` (output goes to
`dist/`).

### Future ideas

- **Split `defaults.js` into categories.** It's the main file for hand-tuning things
  (colors, background counts, sizes, timings, rarities), so breaking it into clearer
  sections or separate files would make small tweaks easier to find.
