import { SCHEMA_VERSION } from "./schema.js";
import { migrate } from "./migrations/index.js";
import {
  schemaVersion,
  defaultTabs,
  defaultLinks,
  defaultLinkGroups,
  defaultSettings,
  defaultAmbientSettings,
  defaultKeybinds,
} from "../defaults.js";

const STORAGE_KEYS = ["schemaVersion", "tabs", "links", "linkGroups", "settings"];
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

function withStyleDefaults(savedStyles = {}) {
  const ids = new Set([...Object.keys(defaultAmbientSettings.backgroundStyles), ...Object.keys(savedStyles)]);
  return Object.fromEntries(
    [...ids].map((id) => [id, { ...defaultAmbientSettings.backgroundStyles[id], ...savedStyles[id] }])
  );
}

function withAmbientDefaults(savedAmbient = {}) {
  return {
    ...defaultAmbientSettings,
    ...savedAmbient,
    backgroundStyles: withStyleDefaults(savedAmbient.backgroundStyles),
  };
}

function withDefaults(raw) {
  return {
    schemaVersion: raw.schemaVersion ?? schemaVersion,
    tabs: raw.tabs ?? defaultTabs,
    links: raw.links ?? defaultLinks,
    linkGroups: raw.linkGroups ?? defaultLinkGroups,
    settings: {
      ...defaultSettings,
      ...raw.settings,
      ambientMode: withAmbientDefaults(raw.settings?.ambientMode),
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
  return withDefaults(migrate(raw));
}

export async function loadKey(key) {
  const result = isExtensionContext
    ? await chrome.storage.local.get(key)
    : await localStorageGet([key]);
  return result[key];
}

export async function save(partial) {
  if (isExtensionContext) return chrome.storage.local.set(partial);
  return localStorageSet(partial);
}

function devStorageKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(DEV_STORAGE_PREFIX)) keys.push(key.slice(DEV_STORAGE_PREFIX.length));
  }
  return keys;
}

export async function loadAll() {
  if (isExtensionContext) return chrome.storage.local.get(null);
  return localStorageGet(devStorageKeys());
}

// Writes the new data before removing stale keys, so a failed write never leaves
// storage emptied.
export async function replaceAll(data) {
  const existingKeys = Object.keys(await loadAll());
  const staleKeys = existingKeys.filter((key) => !(key in data));
  if (isExtensionContext) {
    await chrome.storage.local.set(data);
    await chrome.storage.local.remove(staleKeys);
    return;
  }
  await localStorageSet(data);
  for (const key of staleKeys) localStorage.removeItem(DEV_STORAGE_PREFIX + key);
}

export async function removeKeys(keys) {
  if (isExtensionContext) return chrome.storage.local.remove(keys);
  for (const key of keys) localStorage.removeItem(DEV_STORAGE_PREFIX + key);
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
    linkGroups: defaultLinkGroups,
    settings: defaultSettings,
  });
  await save(payload);
  return payload;
}
