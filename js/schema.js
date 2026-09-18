export const SCHEMA_VERSION = 1;

export function createLink({
  id,
  label,
  url,
  tabId,
  shortcutKey = null,
  launchGroup = false,
  launchOrder = null,
} = {}) {
  return {
    id,
    label,
    url,
    tabId,
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
    showFavicons: false,
    cacheTrimEnabled: false,
    mostUsedTabEnabled: false,
    ambientMode: { bubbleCount: 8 },
    backgroundConfig: { mode: "ambient" },
    ...overrides,
  };
}
