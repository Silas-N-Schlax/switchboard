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
  };
}

export function createTab({ id, name, order = 0, shortcutKey = null } = {}) {
  return { id, name, order, shortcutKey };
}

export function createSettings(overrides = {}) {
  return {
    ...defaultSettings,
    ...overrides,
  };
}
