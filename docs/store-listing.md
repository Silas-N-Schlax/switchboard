# Chrome Web Store listings

Copy for the two listings in the developer dashboard. Images are in `graphics/store/full`
and `graphics/store/lite`: four 1280×800 screenshots, a 440×280 small promo tile and a
1400×560 marquee for each.

## Shared answers

**Category:** Productivity › Workflow & Planning

**Language:** English

**Privacy policy URL:** https://silas-n-schlax.github.io/switchboard-privacy/

**Single purpose:** Replaces the New Tab page with named tabs of links that are quick to
reach from the keyboard, stored only on the user's computer.

**Permission justifications:**

| Permission | Justification |
| --- | --- |
| New tab override | The extension's single purpose is to be the New Tab page. |
| `storage` | Saves the user's tabs, links, settings and optional usage stats locally. |
| `unlimitedStorage` | Large link collections and a long stats history can pass the default local storage limit. |
| `bookmarks` | Imports the browser's bookmarks into tabs, and exports tabs back to bookmarks, only when the user runs an import or export. |
| `alarms` | Schedules the optional daily link health check. |
| `favicon` | Shows each link's icon from the browser's own icon cache, without fetching anything from the web. |
| `search` | Sends a web search to the browser's default search engine when the user's query matches none of their links. |
| `history` (optional) | Requested only when the user turns on "Find icons in your history". Used locally to find icons for saved links; never stored or sent anywhere. |
| `http://*/*`, `https://*/*` (optional) | Requested only when the user turns on the daily link health check, which requests each saved link to see whether it still loads. Local network addresses are skipped. |

**Remote code:** No. Everything ships in the package.

**Data usage:** Collects none of the listed data types. Certify all three statements: not
sold or transferred to third parties, not used for purposes unrelated to the single
purpose, not used to determine creditworthiness or for lending.

## Switchboard

**Name:** Switchboard

**Summary** (from `manifest.json`): A minimal, keyboard-first New Tab replacement — local
link workspaces, no bookmarks, no cloud.

**Description:**

> Switchboard replaces the bookmark bar with named tabs of links on your New Tab page, and
> makes every one of them quick to reach from the keyboard.
>
> • Up to nine named tabs of links, with link groups side by side
> • Number keys switch tabs, and any link can have its own shortcut
> • Press s to search every link on every tab, or the web when nothing matches
> • Launch groups open a set of links at once
> • Import your browser's bookmarks, or a bookmarks file from any browser, and export back
> • Ambient drifting colors and a choice of calm animated scenes: bubbles, an ocean, a
>   mountain lake, the stratosphere, or a bouncing screensaver logo
> • A Layout section strips the page back to just what you use, down to a lone search bar
> • Optional daily check that flags links that no longer load
>
> Everything stays on your computer: no account, no sync, no tracking. Press / any time to
> see every shortcut.
>
> Prefer it without the animated backgrounds? Switchboard Lite is the same app, lighter.

## Switchboard Lite

**Name:** Switchboard Lite

**Summary** (set by `scripts/package.mjs`): Switchboard without the animated backgrounds: a
fast, keyboard-first New Tab with local link workspaces.

**Description:**

> Switchboard Lite is Switchboard without the animated backgrounds: the same named tabs of
> links and keyboard shortcuts, in a lighter package that loads fast on any computer.
>
> • Up to nine named tabs of links, with link groups side by side
> • Number keys switch tabs, and any link can have its own shortcut
> • Press s to search every link on every tab, or the web when nothing matches
> • Launch groups open a set of links at once
> • Import your browser's bookmarks, or a bookmarks file from any browser, and export back
> • Slowly drifting ambient colors, with preset and custom palettes
> • A Layout section strips the page back to just what you use, down to a lone search bar
> • Optional daily check that flags links that no longer load
>
> Everything stays on your computer: no account, no sync, no tracking. Press / any time to
> see every shortcut.
