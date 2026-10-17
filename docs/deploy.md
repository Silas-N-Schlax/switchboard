# Deploying

The agent's job ends when the release PR is open. Merging it into `main` is the owner's
call, and `.github/workflows/deploy.yml` does everything after that. Never create tags,
GitHub releases or store uploads yourself.

## Preparing a release

1. **Propose the version, then wait for approval.** Read every `changes` entry and
   `release.json` note added since the last release, and propose a bump:
   - patch for fixes only
   - minor for new features or visible changes
   - major only when the owner asks for it

   Don't write the version anywhere until the owner confirms it. If unreleased work was
   logged under a different version, rename that `release.json` entry and the matching
   `changes` keys and `added` values.

2. **Run the checks.** All of these must pass, with the results in the PR description:
   - `node scripts/package.mjs` builds both zips without errors.
   - `node scripts/bench/smoke.mjs` passes against both unzipped builds. It cycles
     through every background (full only) and opens Settings and Release notes, with no
     console errors.
   - The benchmark's `startup` and `app` sections, run against the last release tag
     (`EXT=<worktree of the tag>`), show nothing more than about 10% slower. Explain anything that is.
   - A screenshot of the new version's Release notes, so the owner can check the wording
     before it ships.

3. **Open a release PR into `main`** from a `release-<version>` branch, titled
   "Release <version>". It:
   - sets `version` in `manifest.json`
   - gives the top `release.json` entry that version and today's date
   - lists the size of each zip and which features lite leaves out, plus the check
     results and the Release notes screenshot
   - notes whether `privacy.html` changed since the last release. If it did, the owner
     copies it to `index.html` in the public
     [switchboard-privacy](https://github.com/Silas-N-Schlax/switchboard-privacy) repo,
     which serves the store's privacy policy URL:
     https://silas-n-schlax.github.io/switchboard-privacy/

   Then stop. The agent is done.

## What happens on merge

When a change to `manifest.json` lands on `main` and that version has no tag yet, the
Deploy workflow:
1. builds both zips
2. creates the `v<version>` tag and GitHub release, using that version's `release.json`
   notes, with both zips attached
3. submits each zip to its Chrome Web Store listing for review

To get both zips without releasing anything, run the workflow by hand (Actions → Deploy →
Run workflow). That only builds them and attaches them to the run.

Deploying does nothing until these are set in the repo settings:
- **Variables:** `DEPLOY_ENABLED` set to `true`, then `CWS_EXTENSION_ID` and
  `CWS_LITE_EXTENSION_ID`. A listing is skipped while its ID is unset.
- **Secrets:** `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_PUBLISHER_ID`.
