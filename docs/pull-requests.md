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
- No AI attribution anywhere in the PR.
