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
- **Moving things around.** Right-click a link or a group's name (or select it and press
  `m`) and choose **Move…** to send it to another tab, a different group, or a new group,
  and pick where it lands.
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
- **Fonts.** Pick the interface font and the mono font (URLs and key hints) in
  Settings → General. Exchange and Patchcord are the defaults; Manrope, IBM Plex Mono,
  and your system font are there too, all bundled with the extension.
- **Fun stats.** Optionally records link opens, searches, tab use, bookmark imports and
  exports, and Bounce corner hits, locally, for recaps to come.
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

## Brave notes

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

The full policy ships with the extension (Settings → Data → Privacy policy).

Your tabs, links, settings, and usage stats live in your browser's local extension
storage and never leave your machine unless you export a backup or bookmarks yourself. Favicons come
from the browser's own icon cache. The optional history permission (Settings → Links →
Find icons in your history) is only used locally to find icons for links you've saved.

- **Bookmarks:** Switchboard only reads or writes your browser's bookmarks when you run
  an import or export.
- **Link health check (off by default):** turning it on asks for access to all sites.
  That access is only used to request each saved link directly from your browser, to
  see whether it still loads. Local network addresses are skipped.

## Feedback

Bugs, feature requests and quick thoughts all go through the **Send feedback** link at
the bottom of Settings, or [this form](https://forms.gle/23ozsD4amrUqTjGe7).

When reporting a bug, it helps to include your browser and version, and what you
expected versus what happened.

## Development

There's no build step: the repo root is the extension. After editing, open a new tab to
see HTML/CSS/JS changes. Changes to `manifest.json` or `background.js` need the reload
icon on the extensions page.

For quick UI work outside the extension, `core/storage.js` falls back to `localStorage`
when `chrome.storage` isn't available. Serve the folder and open `switchboard.html`:

```
npx serve .
# or: python3 -m http.server
```

Opening `switchboard.html` over `file://` won't work, because browsers block ES modules there.

### Layout, features and the lite build

- `core/` is the app shell that always loads (boot, state, storage, migrations, base styles).
- `shared/` holds plumbing many features use (dialogs, form controls, keybind handling).
- `features/<name>/` keeps one feature's JS, CSS and a `feature.json` together.
  Backgrounds live in `features/backgrounds/<id>/`, with helpers they share in
  `features/backgrounds/shared/`.

`features.json` lists every feature folder, and the app reads it at runtime, so adding a
feature means making its folder and adding one line there. Each `feature.json` looks like:

```json
{
  "id": "fish",
  "name": "Ocean",
  "summary": "One line for the release notes.",
  "added": "1.0.0",
  "lite": false,
  "changes": { "1.1.0": "What changed in that version." },
  "entry": "fish.js",
  "styles": ["fish-field.css"],
  "requires": ["other-feature-id"]
}
```

`entry` and `styles` are only needed for features loaded on demand (backgrounds and the
release notes); `requires` only when a feature uses another one's files. Release notes
in Settings come from these files plus `release.json`, which holds each version's date
and general notes.

To build the store zips, run `node scripts/package.mjs` (or add `full` or `lite`). It
writes `dist/switchboard-<version>.zip` with everything and
`dist/switchboard-lite-<version>.zip` without the features marked `"lite": false`, and
fails if `features.json` and the folders disagree, if `release.json` has no entry for the
version, or if anything shipped points at a file that was left out.

### Benchmarks

`scripts/bench` loads the extension in headless Chromium and measures load time, tab
switches, search, every background's CPU and frame rate, memory leaks, imports, and
stats storage, using generated datasets from 30 to 9,000 links:

```
cd scripts/bench
npm install && npm run setup
npm run bench               # everything (about 10 minutes)
npm run bench -- app,leak   # or pick sections: app, bg, leak, stress, startup, devices
npm run smoke               # quick check: every background, Settings and Release notes load
```

`devices` repeats the key checks with the CPU slowed 4×, 6× and 20× to estimate a
mid-range laptop, a budget laptop or Chromebook, and an old netbook. Results are written
to `scripts/bench/results/`. Headless Chromium has no GPU, so
compare runs with each other rather than with a real browser.

### Future ideas

- **Split `defaults.js` into categories.** It's the main file for hand-tuning things
  (colors, background counts, sizes, timings, rarities), so breaking it into clearer
  sections or separate files would make small tweaks easier to find.
