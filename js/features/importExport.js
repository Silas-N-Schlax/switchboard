import { loadAll, replaceAll } from "../storage.js";
import { SCHEMA_VERSION } from "../schema.js";

const BACKUP_FORMAT = "switchboard-backup";
const CORE_KEYS = ["schemaVersion", "tabs", "links", "settings"];
const STATS_KEY_PATTERN = /^stats:\d{4}-\d{2}$/;

// TODO: Google Bookmarks HTML import, export to chrome.bookmarks
export function importFromBookmarksHtml() {}
export function exportToChromeBookmarks() {}

function backupFileName(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `switchboard-backup-${date.getFullYear()}-${month}-${day}.json`;
}

export async function exportToJson() {
  const backup = {
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    data: await loadAll(),
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = backupFileName();
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidTab(tab) {
  return isObject(tab) && typeof tab.id === "string" && typeof tab.name === "string";
}

function isValidLink(link) {
  return (
    isObject(link) &&
    typeof link.id === "string" &&
    typeof link.url === "string" &&
    typeof link.tabId === "string"
  );
}

export function parseBackup(text) {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!isObject(backup) || backup.format !== BACKUP_FORMAT || !isObject(backup.data)) {
    throw new Error("That file isn't a Switchboard backup.");
  }

  const { data } = backup;
  if (data.schemaVersion !== SCHEMA_VERSION) {
    throw new Error("That backup is from a different version of Switchboard and can't be imported.");
  }
  if (!Array.isArray(data.tabs) || !data.tabs.every(isValidTab)) {
    throw new Error("That backup's tabs are damaged.");
  }
  if (!Array.isArray(data.links) || !data.links.every(isValidLink)) {
    throw new Error("That backup's links are damaged.");
  }
  if (data.settings !== undefined && !isObject(data.settings)) {
    throw new Error("That backup's settings are damaged.");
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    if (CORE_KEYS.includes(key)) cleaned[key] = value;
    else if (STATS_KEY_PATTERN.test(key) && Array.isArray(value)) cleaned[key] = value;
  }
  return cleaned;
}

export async function readBackupFile(file) {
  return parseBackup(await file.text());
}

export async function importFromJson(data) {
  await replaceAll(data);
}
