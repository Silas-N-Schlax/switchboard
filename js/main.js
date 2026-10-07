import { load, loadKey, isInitialized, seedFromDefaults } from "./storage.js";
import { focusPageOnOpen } from "../defaults.js";
import { setState, state } from "./state.js";
import { renderAmbient } from "./render/ambient.js";
import { renderTabs } from "./render/tabs.js";
import { renderLinks } from "./render/links.js";
import { renderSearch, focusSearchBar } from "./render/search.js";
import { initSettingsToggle } from "./features/settings/index.js";
import { applyDisplaySettings } from "./features/settings/store.js";
import { initCheatsheetToggle } from "./features/cheatsheet/index.js";
import { defaultTab } from "./features/tabLinks/store.js";
import { initKeybindListener } from "./features/keybinds/registry.js";
import { initGlobalContextMenu } from "./features/contextMenu/menus.js";
import { initLinkShortcutListener } from "./features/tabLinks/linkShortcuts.js";
import { initLinkTabbing } from "./features/tabLinks/linkTabbing.js";
import { initLaunchGroups } from "./features/launchGroups/index.js";
import { recordEvent, StatEvent } from "./features/stats/recorder.js";

const focusParam = "focus";

// Chrome always gives a freshly opened New Tab override's keyboard focus to the address
// bar, leaving every keybind dead until a click. A navigation started by the page itself
// hands focus to the page; one started through chrome.tabs.update does not, so this has
// to stay a document.location redirect (see https://github.com/philc/vimium/issues/4741).
async function redirectForPageFocus() {
  const isExtension = typeof chrome !== "undefined" && !!chrome.storage;
  if (!isExtension || new URLSearchParams(location.search).has(focusParam)) return false;
  try {
    const settings = await loadKey("settings");
    if (!(settings?.focusPageOnOpen ?? focusPageOnOpen)) return false;
  } catch (err) {
    console.warn("[switchboard] couldn't read the focus setting", err);
    return false;
  }
  document.location.href = `${location.pathname}?${focusParam}`;
  return true;
}

async function init() {
  const initialized = await isInitialized();
  const data = initialized ? await load() : await seedFromDefaults();
  setState(data);
  if (!state.activeTabId) {
    state.activeTabId = defaultTab()?.id ?? null;
  }
  recordEvent(StatEvent.newTab, { tabId: state.activeTabId });
  console.log("[switchboard] initialized:", initialized, data);
  initKeybindListener();
  initLinkShortcutListener();
  initLinkTabbing();
  initLaunchGroups(renderTabLinks);
  initGlobalContextMenu(renderTabLinks);
  render();
  if (state.settings.focusPageOnOpen && state.settings.focusSearchOnOpen) focusSearchBar();
}

function render() {
  renderAmbient(document.body, state.settings);
  applyDisplaySettings(document.body);
  initSettingsToggle(document.body, renderTabLinks);
  initCheatsheetToggle(document.body);
  renderTabLinks();
}

function renderTabLinks() {
  renderTabs(document.body, renderTabLinks);
  renderLinks(document.body, renderTabLinks);
  renderSearch(document.body, renderTabLinks);
}

redirectForPageFocus().then((redirected) => {
  if (!redirected) init();
});
