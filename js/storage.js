import { SCHEMA_VERSION } from "./schema.js";
import {
  schemaVersion,
  defaultTabs,
  defaultLinks,
  defaultSettings,
  defaultAmbientSettings,
  defaultKeybinds,
} from "../defaults.js";

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

function withDefaults(raw) {
  return {
    schemaVersion: raw.schemaVersion ?? schemaVersion,
    tabs: raw.tabs ?? defaultTabs,
    links: raw.links ?? defaultLinks,
    settings: {
      ...defaultSettings,
      ...raw.settings,
      ambientMode: {
        ...defaultAmbientSettings,
        ...raw.settings?.ambientMode,
      },
      keybinds: {
        ...defaultKeybinds,
        ...raw.settings?.keybinds,
      },
    },
  };
}

export async function load() {
  const raw = isExtensionContext
    ? await chrome.storage.local.get(STORAGE_KEYS)
    : await localStorageGet(STORAGE_KEYS);
  return withDefaults(raw);
}

export async function save(partial) {
  if (isExtensionContext) return chrome.storage.local.set(partial);
  return localStorageSet(partial);
}

export async function isInitialized() {
  const { schemaVersion: storedVersion } = isExtensionContext
    ? await chrome.storage.local.get("schemaVersion")
    : await localStorageGet(["schemaVersion"]);
  return storedVersion === SCHEMA_VERSION;
}

export async function seedFromDefaults() {
  const payload = structuredClone({
    schemaVersion,
    tabs: defaultTabs,
    links: defaultLinks,
    settings: defaultSettings,
  });
  await save(payload);
  return payload;
}
