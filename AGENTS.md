# Switchboard: notes for agents

A keyboard-first New Tab Chrome extension (Manifest V3). Read `PRODUCT.md` for what it is
and what it refuses to become, and `README.md` for features and development setup.

## Ground rules

- No build step. The repo root is the extension: plain ES modules, CSS with nesting, BEM
  class names. Don't add a bundler, framework or npm dependency to the extension itself.
- Fully local. Nothing leaves the machine except exports the user makes.
- Respect `prefers-reduced-motion` and keep everything reachable from the keyboard.
- Match the surrounding code: its naming, comment density and idiom. Tunable numbers live
  in `defaults.js`.

## Layout

- `core/`: the app shell that always loads (boot, state, storage, schema, migrations, base styles).
- `shared/`: plumbing many features use (dialogs, form controls, keybind handling).
- `features/<name>/`: one feature's JS, CSS and `feature.json`. Backgrounds live in
  `features/backgrounds/<id>/`, and helpers only they use live in `features/backgrounds/shared/`.
- `features.json` lists every feature folder, and the app reads it at runtime.
- `release.json` holds each version's date and general notes.

## Features and the lite build

- A new feature gets its own folder with a `feature.json` (see the README for its fields),
  plus one line in `features.json`.
- Set `"lite": false` only for features the lite build should drop. Kept code must never
  import a lite-dropped feature. `node scripts/package.mjs` fails if it does.
- A user-visible change to an existing feature adds an entry to that feature's `changes`,
  under the upcoming version (see `docs/pull-requests.md`).

## Checking your work

- `node scripts/package.mjs` builds both zips and checks feature data and imports.
- `node scripts/bench/smoke.mjs [folder]` loads a build headless and checks every background,
  Settings and Release notes.
- `scripts/bench` (Playwright) also benchmarks the extension. Run the relevant sections
  before and after a performance-sensitive change.
- For UI changes, look at the result in a browser and take screenshots for the PR, then
  attach them with `gh --attach` (see `docs/pull-requests.md`).

## Git and GitHub

- Commits: an imperative sentence in plain words, no Conventional Commit prefixes, and
  no AI attribution anywhere.
- Pull requests: follow `docs/pull-requests.md`.
- Deploying: follow `docs/deploy.md`; store listing copy lives in `docs/store-listing.md`.
  Never publish a release or push to the store unless the user asks.
