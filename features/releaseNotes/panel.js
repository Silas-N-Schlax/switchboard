// Settings › Release notes. Built from release.json (dates and general notes per version) and
// each shipped feature's feature.json (when it was added, and what changed in later versions),
// so a build only ever describes the features it actually has.
import releaseLog from "../../release.json" with { type: "json" };
import { featureFolders, loadFeatureManifest } from "../../core/features.js";
import { buildDialogHeader, buildDialogGroup } from "../../shared/dialog/chrome.js";

let rootEl = null;
let returnFocusEl = null;

function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

// One entry per version, newest first: its date and notes from release.json, plus the
// features added in it and the ones whose `changes` mention it.
function buildReleases(features) {
  const releases = new Map(releaseLog.releases.map((r) => [r.version, { ...r, added: [], updated: [] }]));
  const releaseFor = (version) => {
    if (!releases.has(version)) releases.set(version, { version, date: null, notes: [], added: [], updated: [] });
    return releases.get(version);
  };
  features.forEach((feature) => {
    releaseFor(feature.added).added.push(feature);
    Object.entries(feature.changes ?? {}).forEach(([version, change]) => {
      if (version !== feature.added) releaseFor(version).updated.push({ ...feature, change });
    });
  });
  return [...releases.values()].sort((a, b) => compareVersions(b.version, a.version));
}

function buildRow(title, text) {
  const row = document.createElement("div");
  row.className = "release-notes__row";
  const titleEl = document.createElement("span");
  titleEl.className = "release-notes__name";
  titleEl.textContent = title;
  const textEl = document.createElement("span");
  textEl.className = "release-notes__text";
  textEl.textContent = text;
  row.append(titleEl, textEl);
  return row;
}

function buildRelease({ version, date, notes = [], added, updated }, isFirst) {
  const release = document.createElement("section");
  release.className = "release-notes__release";

  const heading = document.createElement("h3");
  heading.className = "release-notes__version";
  heading.textContent = version;
  const dateEl = document.createElement("span");
  dateEl.className = "release-notes__date";
  dateEl.textContent = date ?? "Unreleased";
  heading.appendChild(dateEl);
  release.appendChild(heading);

  if (notes.length) {
    const list = document.createElement("ul");
    list.className = "release-notes__notes";
    list.append(
      ...notes.map((note) => {
        const item = document.createElement("li");
        item.textContent = note;
        return item;
      })
    );
    release.appendChild(list);
  }
  if (added.length) {
    const label = isFirst ? "Features" : "New";
    release.appendChild(buildDialogGroup({ label, rows: added.map((f) => buildRow(f.name, f.summary)) }).group);
  }
  if (updated.length) {
    const rows = updated.map((f) => buildRow(f.name, f.change));
    release.appendChild(buildDialogGroup({ label: "Updated", rows }).group);
  }
  return release;
}

function buildBody(features) {
  const body = document.createElement("div");
  body.className = "dialog__body custom-scrollbar";
  const releases = buildReleases(features);
  body.append(...releases.map((release, i) => buildRelease(release, i === releases.length - 1)));
  return body;
}

function onKeyDown(e) {
  // Contain every key so app keybinds and the settings panel behind can't react to them.
  e.stopPropagation();
  if (e.key === "Escape") {
    e.preventDefault();
    closeReleaseNotes();
  }
}

async function build() {
  const features = await Promise.all(featureFolders.map(loadFeatureManifest));
  const manifest = globalThis.chrome?.runtime?.getManifest?.();

  const root = document.createElement("div");
  root.className = "release-notes";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Release notes");

  const backdrop = document.createElement("div");
  backdrop.className = "overlay-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "release-notes__dialog dialog surface";
  dialog.tabIndex = -1;

  const { header, close } = buildDialogHeader({
    title: "Release notes",
    subtitle: manifest ? `${manifest.name} ${manifest.version}` : null,
    closeLabel: "Close release notes",
  });

  dialog.append(header, buildBody(features));
  root.append(backdrop, dialog);

  close.addEventListener("click", closeReleaseNotes);
  backdrop.addEventListener("click", closeReleaseNotes);
  root.addEventListener("keydown", onKeyDown);
  return root;
}

export function closeReleaseNotes() {
  if (!rootEl?.classList.contains("release-notes--open")) return;
  rootEl.classList.remove("release-notes--open");
  if (returnFocusEl?.isConnected) returnFocusEl.focus();
  returnFocusEl = null;
}

export async function openReleaseNotes() {
  returnFocusEl = document.activeElement;
  if (!rootEl) {
    rootEl = await build();
    document.body.appendChild(rootEl);
  }
  rootEl.classList.add("release-notes--open");
  rootEl.querySelector(".release-notes__dialog").focus();
}
