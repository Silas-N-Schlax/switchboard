import { buildRow } from "./controls.js";
import { buildDialogGroup } from "../dialog/chrome.js";
import { exportToJson, readBackupFile, importFromJson } from "../importExport.js";
import { confirmDialog, alertDialog, typedConfirmDialog } from "../dialog/confirm.js";
import { resetToDefaults } from "../../storage.js";
import { clearEverythingPhrase } from "../../../defaults.js";
import { showToast } from "../dialog/toast.js";
import { hasChromeBookmarks, readChromeBookmarks, readBookmarksFile } from "../bookmarks/tree.js";
import { importBookmarksDialog } from "../bookmarks/importDialog.js";
import { chooseImportSource, BookmarkTarget } from "../bookmarks/chooser.js";
import { importBookmarks } from "../bookmarks/importStore.js";

function buildActionButton(text, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "settings-panel__action";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function pluralize(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function importToast({ added, duplicates, newTabs }) {
  const parts = [`Imported ${pluralize(added, "link")}`];
  if (newTabs.length) parts.push(`into ${pluralize(newTabs.length, "new tab")}`);
  const message = parts.join(" ") + (duplicates ? ` · skipped ${duplicates} already there` : "");
  showToast(message, { tone: "success" });
}

function buildActions(...buttons) {
  const wrap = document.createElement("div");
  wrap.className = "settings-panel__actions";
  wrap.append(...buttons);
  return wrap;
}

function buildBookmarksRow(onChange) {
  async function run(read, source) {
    let found;
    try {
      found = await read();
    } catch (err) {
      await alertDialog({ title: "Can't read those bookmarks", message: err.message });
      return;
    }
    if (!found.folders.length) {
      await alertDialog({ title: "No bookmarks found", message: "There aren't any links to import there." });
      return;
    }
    const rows = await importBookmarksDialog(found);
    if (!rows) return;
    importToast(await importBookmarks(rows, source));
    onChange();
  }

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.name = "bookmarks-file";
  fileInput.accept = ".html,.htm,text/html";
  fileInput.hidden = true;
  fileInput.addEventListener("change", () => {
    const [file] = fileInput.files;
    fileInput.value = "";
    if (file) run(() => readBookmarksFile(file), "file");
  });

  const importButton = buildActionButton("Import", async () => {
    const source = hasChromeBookmarks() ? await chooseImportSource() : BookmarkTarget.file;
    if (source === BookmarkTarget.browser) run(readChromeBookmarks, source);
    else if (source === BookmarkTarget.file) fileInput.click();
  });

  const row = buildRow({ labelText: "Browser bookmarks", control: buildActions(importButton), tag: "div" });
  row.appendChild(fileInput);
  return row;
}

export function buildDataSection(onChange = () => {}) {
  const exportButton = buildActionButton("Export", async () => {
    await exportToJson();
    showToast("Backup downloaded", { tone: "success" });
  });
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.name = "backup-file";
  fileInput.accept = ".json,application/json";
  fileInput.hidden = true;
  fileInput.addEventListener("change", async () => {
    const [file] = fileInput.files;
    fileInput.value = "";
    if (!file) return;

    let data;
    try {
      data = await readBackupFile(file);
    } catch (err) {
      await alertDialog({ title: "Can't import that file", message: err.message });
      return;
    }

    const summary = `${pluralize(data.tabs.length, "tab")} and ${pluralize(data.links.length, "link")}`;
    const confirmed = await confirmDialog({
      title: "Restore this backup?",
      message:
        `The backup has ${summary}. It replaces all your current tabs, links, settings, ` +
        "and stats, and that can't be undone.",
      confirmLabel: "Replace everything",
      danger: true,
    });
    if (!confirmed) return;
    await importFromJson(data);
    location.reload();
  });

  const importButton = buildActionButton("Import", () => fileInput.click());
  const backupRow = buildRow({
    labelText: "Switchboard backup",
    control: buildActions(importButton, exportButton),
    tag: "div",
  });
  backupRow.appendChild(fileInput);

  const clearButton = buildActionButton("Clear", async () => {
    const confirmed = await typedConfirmDialog({
      title: "Clear everything?",
      message:
        "This deletes every tab, link, setting, and stat, and Switchboard starts over as if " +
        "it were just installed. It can't be undone, so export a backup first if you might " +
        "want any of it back.",
      phrase: clearEverythingPhrase,
      confirmLabel: "Clear everything",
    });
    if (!confirmed) return;
    await resetToDefaults();
    location.reload();
  });
  clearButton.classList.add("settings-panel__action--danger");
  const clearRow = buildRow({ labelText: "Clear everything", control: clearButton, tag: "div" });

  const { group } = buildDialogGroup({
    label: "Data",
    rows: [backupRow, buildBookmarksRow(onChange), clearRow],
    note:
      "A backup is a JSON file with your tabs, links, settings, and stats. Importing one " +
      "replaces everything here, so export first if you want to keep what you have. " +
      "Importing bookmarks only adds links, from this browser or a file exported from any other.",
  });

  return { element: group };
}
