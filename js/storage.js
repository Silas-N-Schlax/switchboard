import { SCHEMA_VERSION } from "./schema.js";

const STORAGE_KEYS = ["schemaVersion", "tabs", "links", "settings"];
const DEV_STORAGE_PREFIX = "switchboard:";

const isExtensionContext = typeof chrome !== "undefined" && !!chrome.storage;

async function localStorageGet(keys) {
  const result = {};
  for (const key of keys) {
    const raw = localStorage.getItem(DEV_STORAGE_PREFIX + key);
    if (raw !== null) result[key] = JSON.parse(raw);
  }
  return result;
}

async function localStorageSet(partial) {
  for (const [key, value] of Object.entries(partial)) {
    localStorage.setItem(DEV_STORAGE_PREFIX + key, JSON.stringify(value));
  }
}

export async function load() {
  if (isExtensionContext) return chrome.storage.local.get(STORAGE_KEYS);
  return localStorageGet(STORAGE_KEYS);
}

export async function save(partial) {
  if (isExtensionContext) return chrome.storage.local.set(partial);
  return localStorageSet(partial);
}

export async function isInitialized() {
  const { schemaVersion } = isExtensionContext
    ? await chrome.storage.local.get("schemaVersion")
    : await localStorageGet(["schemaVersion"]);
  return schemaVersion === SCHEMA_VERSION;
}

export async function seedFromDefaults() {
  const url = isExtensionContext
    ? chrome.runtime.getURL("defaults.json")
    : "./defaults.json";
  const response = await fetch(url);
  const defaults = await response.json();
  await save(defaults);
  return defaults;
}
