# Chrome Web Store submission (temporary)

Copy and paste for both listings. Delete this file once they're submitted.

## Both listings

**Category:** Productivity › Workflow & Planning

**Language:** English

**Privacy policy URL:** https://silas-n-schlax.github.io/switchboard-privacy/

### Single purpose

```
Replaces the New Tab page with named tabs of links that are quick to reach from the keyboard, stored only on the user's computer.
```

### Permission justifications

**New tab override** (`chrome_url_overrides.newtab`)
```
The extension's single purpose is to be the New Tab page: it shows the user's tabs of links every time a new tab opens.
```

**storage**
```
Saves the user's tabs, links, link groups, settings and optional usage stats in the browser's local extension storage. Nothing is synced or sent anywhere.
```

**unlimitedStorage**
```
People keep hundreds or thousands of links, and the optional stats history grows over time. Both can pass the default local storage limit, and losing saved links to a quota error is not acceptable.
```

**bookmarks**
```
Used only when the user runs an import or export in Settings: importing reads the browser's bookmarks into tabs of links, and exporting writes the user's tabs back into bookmarks. Bookmarks are never read or changed otherwise.
```

**alarms**
```
Schedules the optional daily link health check, which is off by default and only runs once the user turns it on.
```

**favicon**
```
Shows each saved link's icon from the browser's own icon cache, so icons appear without fetching anything from the web.
```

**search**
```
When the user's search matches none of their links and they press Enter, the query is handed to the browser's own default search engine, so it respects the engine they already chose. This is the "Browser default" search option, which is on by default; the user can pick a specific search site instead in Settings.
```

**history** (optional permission)
```
Requested only when the user turns on "Find icons in your history" in Settings. Used locally to find the right icon for links the user has saved, when the icon cache has none for that exact address. History is never stored or sent anywhere.
```

**Host permissions `http://*/*` and `https://*/*`** (optional permission)
```
Requested only when the user turns on the daily link health check in Settings. The check requests each of the user's saved links to see whether it still loads, and marks the ones that don't. Local network addresses are skipped, nothing is sent anywhere else, and links are never deleted.
```

### Remote code

**Are you using remote code?** No.
```
All code ships in the extension package. Nothing is loaded from a server.
```

### Data usage

Tick none of the data types: Switchboard collects no user data. Everything stays in local
extension storage on the user's computer.

Tick all three certifications:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

## Switchboard

**Zip:** `dist/switchboard-1.0.0.zip`

**Images:** `graphics/store/full/`: `1-tab-of-links.png` to `5-shortcuts.png`, the small promo
tile `chrome-store-promo-small-440x280.png` and the marquee `chrome-store-marquee-1400x560.png`

**Summary** (from `manifest.json`, set automatically):
```
A minimal, keyboard-first New Tab replacement — local link workspaces, no bookmarks, no cloud.
```

**Description:**
```
Switchboard turns your New Tab page into a calm, keyboard-first home for the links you use every day. Instead of a cluttered bookmark bar, your links live in named tabs, and every one of them is a keystroke away.

• Up to nine named tabs of links, with link groups side by side
• Number keys switch tabs, and any link can have its own shortcut
• Press s to search every link on every tab, or the web when nothing matches
• Launch groups open a set of links at once
• Bring your bookmarks over from this browser or any bookmarks file, and export them back
• Slowly drifting ambient colors, with a choice of calm animated scenes: rising bubbles, an ocean, a mountain lake, the stratosphere, or a bouncing screensaver logo
• Strip the page back to just what you use, down to a lone search bar
• An optional daily check flags links that no longer load

Everything stays on your computer: no account, no sync, no tracking. Every shortcut can be changed, and pressing / shows them all.

Want it without the animated scenes? Switchboard Lite is the same app, lighter and faster to load.
```

## Switchboard Lite

**Zip:** `dist/switchboard-lite-1.0.0.zip`

**Images:** `graphics/store/lite/`: `1-tab-of-links.png` to `5-shortcuts.png`, the small promo
tile `chrome-store-promo-small-440x280.png` and the marquee `chrome-store-marquee-1400x560.png`

**Summary** (set by `scripts/package.mjs`, automatic):
```
Switchboard without the animated backgrounds: a fast, keyboard-first New Tab with local link workspaces.
```

**Description:**
```
Switchboard Lite is Switchboard without the animated backgrounds: the same keyboard-first New Tab page, in a lighter package that loads fast on any computer.

• Named tabs of links, with link groups, launch groups and a shortcut for every tab and link
• Press s to search every link on every tab, or the web when nothing matches
• Bring your bookmarks over from this browser or any bookmarks file
• Slowly drifting ambient colors, with preset and custom palettes
• Strip the page back to just what you use, down to a lone search bar

Everything stays on your computer: no account, no sync, no tracking. Want the animated ocean, mountain lake and stratosphere scenes? Get the full Switchboard.
```
