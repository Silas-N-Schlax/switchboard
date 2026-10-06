import { buildRow } from "./controls.js";
import { buildDialogGroup } from "../dialog/chrome.js";
import { exportToJson, readBackupFile, importFromJson } from "../importExport.js";
import { confirmDialog, alertDialog } from "../dialog/confirm.js";
import { showToast } from "../dialog/toast.js";

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

export function buildDataSection() {
  const exportButton = buildActionButton("Export", async () => {
    await exportToJson();
    showToast("Backup downloaded", { tone: "success" });
  });
  const exportRow = buildRow({ labelText: "Export backup", control: exportButton, tag: "div" });

  const fileInput = document.createElement("input");
  fileInput.type = "file";
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
  const importRow = buildRow({ labelText: "Restore from backup", control: importButton, tag: "div" });
  importRow.appendChild(fileInput);

  const { group } = buildDialogGroup({
    label: "Data",
    rows: [exportRow, importRow],
    note:
      "Backups are a JSON file with your tabs, links, settings, and stats. Restoring one " +
      "replaces everything here, so export first if you want to keep what you have.",
  });

  return { element: group };
}
