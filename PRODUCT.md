# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Chrome extension (Manifest V3) that replaces the New Tab page via
`chrome_url_overrides.newtab`. Chromium-first; Brave/Edge/Vivaldi expected to work
unchanged, Firefox would need a separate manifest.

## Users

Built first for its author, a developer who opens dozens of new tabs a day and wants to
retire Chrome's native bookmarks entirely. Intended to go public later (Chrome Web Store),
so a stranger installing it must be able to understand and use it without being taught —
but the primary user is a returning, keyboard-fluent power user, not a first-timer.

## Product Purpose

Replace the bookmark bar with named tabs (workspaces) of links on the New Tab page, and
make reaching any link fast: number keys to switch tabs, per-link shortcuts, a search bar
that jumps to links or falls back to Google, and launch groups that open a set of links
in order. Success is the user never reaching for native bookmarks again and every new tab
feeling calm rather than cluttered.

## Positioning

A bookmark replacement that refuses to recreate bookmark bloat: keyboard-first,
fully local, and deliberately small. Features are cut aggressively rather than accumulated.

## Operating Context

Seen on every new tab, many times a day, usually for a second or two before the user jumps
somewhere. The page is the moment between tasks — it should read instantly and then get
out of the way. Mouse is optional; secondary actions live in a custom right-click menu and
keyboard shortcuts rather than visible buttons.

## Capabilities and Constraints

- Fully local: `chrome.storage.local` + `unlimitedStorage`. No cloud, no sync, no server,
  ever. Nothing leaves the machine except exports the user makes.
- Tabs (max 9, slot 1 is the home/search tab; a default opening tab can be set), links
  with optional modifier-combo shortcuts, launch groups, cross-tab search with Google
  fallback, `/` shortcut cheat sheet, settings panel, ambient drifting color background
  with bubbles, local usage-stats recording for future recaps.
- Dead links are never auto-deleted; health checks are informational only.
- Permanently cut: quick-note scratchpad, clock/focus timer, custom photo backgrounds,
  Recently Closed panel, "Most Used" tab.
- No build step; plain ES modules, CSS with nesting, BEM class names.

## Brand Commitments

- Name: Switchboard.
- Feel (user's words): "a calm atmospheric feel with a balanced yet quiet and dignified
  instrument and tool." Atmosphere in the backdrop; the controls on top are restrained,
  precise, and confident.
- Minimalist above all — the interface should never get busier to accommodate a feature.

## Evidence on Hand

No users, testimonials, or metrics yet. Do not fabricate any.

## Product Principles

1. Calm over clever — every new tab should lower the user's pulse, not raise it.
2. Keyboard first, mouse welcome — everything reachable without the mouse, nothing hidden
   from someone who uses one.
3. Subtract before adding — a feature earns screen space only if it replaces clutter.
4. Local and private by construction.
5. Learnable in one glance for a stranger, fast in the hands of the owner.

## Accessibility & Inclusion

Respect `prefers-reduced-motion` (ambient drift and bubbles already do). Full keyboard
operability is a core feature, not a compliance item.
