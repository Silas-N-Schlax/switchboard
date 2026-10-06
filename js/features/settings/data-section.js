import { buildRow } from "./controls.js";
import { buildDialogGroup } from "../dialog/chrome.js";
import { exportToJson, readBackupFile, importFromJson } from "../importExport.js";

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
  const exportButton = buildActionButton("Export", () => exportToJson());
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
      alert(err.message);
      return;
    }

    const summary = `${pluralize(data.tabs.length, "tab")} and ${pluralize(data.links.length, "link")}`;
    if (!confirm(`Replace everything in Switchboard with this backup (${summary})? This can't be undone.`)) {
      return;
    }
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
