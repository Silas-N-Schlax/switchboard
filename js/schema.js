import { schemaVersion, defaultSettings } from "../defaults.js";

export const SCHEMA_VERSION = schemaVersion;

export function createLink({
  id,
  label,
  url,
  tabId,
  order = 0,
  shortcutKey = null,
  launchGroup = false,
  launchOrder = null,
  createdAt = Date.now(),
} = {}) {
  return {
    id,
    label,
    url,
    tabId,
    order,
    shortcutKey,
    launchGroup,
    launchOrder,
    clickCount: 0,
    lastUsed: null,
    lastChecked: null,
    healthStatus: "unknown",
    firstFailedAt: null,
    createdAt,
  };
}

export function createTab({ id, name, order = 0, shortcutKey = null, createdAt = Date.now() } = {}) {
  return { id, name, order, shortcutKey, createdAt };
}

export function createSettings(overrides = {}) {
  return {
    ...defaultSettings,
    ...overrides,
  };
}
