import { load, loadKey, isInitialized, seedFromDefaults } from "./storage.js";
import { focusPageOnOpen } from "../defaults.js";
import { setState, state } from "./state.js";
import { renderAmbient } from "./render/ambient.js";
import { renderTabs } from "./render/tabs.js";
import { renderLinks } from "./render/links.js";
import { renderSearch } from "./render/search.js";
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
// bar, leaving every keybind dead until a click. Re-navigating the tab to the page's own
// URL is an ordinary page load, so focus lands on the page instead.
async function redirectForPageFocus() {
  const isExtension = typeof chrome !== "undefined" && !!chrome.tabs;
  if (!isExtension || new URLSearchParams(location.search).has(focusParam)) return false;
  try {
    const settings = await loadKey("settings");
    if (!(settings?.focusPageOnOpen ?? focusPageOnOpen)) return false;
    const tab = await chrome.tabs.getCurrent();
    if (!tab) return false;
    await chrome.tabs.update(tab.id, { url: chrome.runtime.getURL(`newtab.html?${focusParam}`) });
    return true;
  } catch (err) {
    console.warn("[switchboard] focus redirect failed", err);
    return false;
  }
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
