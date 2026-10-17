# Pull requests

## Before opening one

- [ ] Every user-visible change to a feature has an entry in that feature's `feature.json`
      `changes`, keyed by the upcoming version: the top entry in `release.json` while its
      `date` is still `null`.
- [ ] A new feature has its own folder, a `feature.json` with `added` set to the upcoming
      version and a deliberate `lite` value, and a line in `features.json`.
- [ ] Changes that belong to no single feature are in that version's `notes` in `release.json`.
- [ ] `node scripts/package.mjs` passes.
- [ ] Performance-sensitive changes have benchmark numbers from before and after.
- [ ] UI changes have screenshots (required).

## Title

Short, Title Case, natural language, no prefix: "Add Font Settings", "Stop Contact Button Spam".

## Description template

```markdown
## Why

One or two short paragraphs on the problem or goal, in plain words. Mention any PR this
stacks on and which one to merge first.

## What Changed

- [x] One line per distinct change

## Post-merge

- [ ] Anything someone has to do after merging (e.g. reload the extension in `chrome://extensions`)

## Screenshots

**What this shows**

![Alt text describing the screenshot](url)
```

- Leave out **Post-merge** when nothing is needed.
- **Screenshots** is required whenever the UI changes: one labelled screenshot per visible
  change, showing the real extension. Leave it out only for changes with nothing visible.
- A small change can skip the headings and use one to three plain sentences instead.

## Adding screenshots

Upload screenshots with the PR itself. Don't leave local file paths for the owner to
drag in. `gh` 2.99 or newer attaches images directly with the repeatable `--attach` flag
(run `gh --version`, and `brew upgrade gh` if it's older):

1. Take the screenshots of the real extension (`scripts/bench/smoke.mjs` shows how to load
   a build in headless Chromium; `deviceScaleFactor: 2` keeps them sharp) and save them as
   PNGs next to the body file.
2. In the description, put each image under its caption as a Markdown image pointing at
   the local file, e.g. `![Release notes dialog](./release-notes.png)`.
3. Create or update the PR with one `--attach` per file. `gh` uploads each file and swaps
   the local path in the body for its GitHub URL:

   ```
   gh pr create --body-file body.md --attach ./release-notes.png --attach ./icons.png …
   gh pr edit <n> --body-file body.md --attach ./release-notes.png …
   ```

4. Check the PR in the browser and make sure every image loads.
