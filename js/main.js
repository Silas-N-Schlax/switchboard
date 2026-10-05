import { load, isInitialized, seedFromDefaults } from "./storage.js";
import { setState, state } from "./state.js";
import { renderAmbient } from "./render/ambient.js";
import { renderTabs } from "./render/tabs.js";
import { renderLinks } from "./render/links.js";
import { renderSearch } from "./render/search.js";
import { initSettingsToggle } from "./features/settings/index.js";
import { initCheatsheetToggle } from "./features/cheatsheet/index.js";
import { defaultTab } from "./features/tabLinks/store.js";
import { initKeybindListener } from "./features/keybinds/registry.js";
import { initGlobalContextMenu } from "./features/contextMenu/menus.js";
import { initLinkShortcutListener } from "./features/tabLinks/linkShortcuts.js";
import { initLinkTabbing } from "./features/tabLinks/linkTabbing.js";
import { initLaunchGroups } from "./features/launchGroups/index.js";
import { recordEvent, StatEvent } from "./features/stats/recorder.js";

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
  initSettingsToggle(document.body, renderTabLinks);
  initCheatsheetToggle(document.body);
  renderTabLinks();
}

function renderTabLinks() {
  renderTabs(document.body, renderTabLinks);
  renderLinks(document.body, renderTabLinks);
  renderSearch(document.body, renderTabLinks);
}

init();
