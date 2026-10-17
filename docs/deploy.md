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
     (`EXT=<worktree of the tag>`), show nothing more than about 10% slower. Explain anything
     that is. The first release (1.0.0) had no earlier tag to compare with.
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

When the release PR lands on `main`, the Deploy workflow sees a version in `manifest.json`
with a date in `release.json` and no tag yet. It then:
1. builds both zips
2. creates the `v<version>` tag and GitHub release, using that version's `release.json`
   notes, with both zips attached
3. submits each zip to its Chrome Web Store listing for review

A version without a date, or one already tagged, is left alone, so logging upcoming
changes in `release.json` never ships anything.

Running the workflow by hand (Actions → Deploy → Run workflow) builds both zips and
attaches them to the run. Ticking **deploy** also releases and submits them. Use that to
publish a release merged before deploying was set up, or to retry a failed store
submission; the tag and GitHub release are only created once.

Deploying does nothing until these are set in the repo settings:
- **Variables:** `DEPLOY_ENABLED` set to `true`, then `CWS_EXTENSION_ID` and
  `CWS_LITE_EXTENSION_ID`. A listing is skipped while its ID is unset.
- **Secrets:** `CWS_SERVICE_ACCOUNT_KEY` (the service account's JSON key) and `CWS_PUBLISHER_ID`.

## First-time setup

Done once, by the owner, before the first store release.

1. **Build the zips:** `node scripts/package.mjs` writes `dist/switchboard-<version>.zip`
   and `dist/switchboard-lite-<version>.zip`.
2. **Create both listings.** In the
   [developer dashboard](https://chrome.google.com/webstore/devconsole), add a new item for
   each zip. Fill in each listing from `docs/store-listing.md` and upload the images in
   `graphics/store/full` and `graphics/store/lite`. Each item's ID (the 32-letter ID in its
   dashboard URL) is that listing's extension ID. Submitting these first versions by hand is
   fine; the workflow takes over from the next version.
3. **Find the publisher ID** under Publisher settings in the developer dashboard.
4. **Create a service account** for the API. A service account needs no OAuth consent
   screen, so it works without a domain of your own, and its key doesn't expire by default.
   1. In the [Google Cloud console](https://console.cloud.google.com/), create a project
      and enable the **Chrome Web Store API** (APIs & Services → Library).
   2. Go to **IAM & Admin → Service accounts → Create service account**. Give it a name;
      it needs no roles.
   3. Open it, go to **Keys → Add key → Create new key → JSON**, and keep the downloaded
      file safe. Its whole contents is the `CWS_SERVICE_ACCOUNT_KEY` secret.
   4. In the developer dashboard's **Account** section, add the service account's email
      (`…@….iam.gserviceaccount.com`) so it can manage your items.
5. **Add the repo secrets and variables** listed above (Settings → Secrets and variables →
   Actions). Set `DEPLOY_ENABLED` to `true` last.
6. **Check it:** run the Deploy workflow by hand with **deploy** ticked. For a version the
   store already has, the upload is rejected, which still proves the credentials work.
   After that, every merged release PR deploys on its own.
