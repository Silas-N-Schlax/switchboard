import { load, isInitialized, seedFromDefaults } from "./storage.js";
import { setState, state } from "./state.js";
import { renderAmbient } from "./render/ambient.js";
import { renderTabs } from "./render/tabs.js";
import { renderLinks } from "./render/links.js";
import { renderSearch } from "./render/search.js";
import { initSettingsToggle } from "./features/settings/index.js";
import { initCheatsheetToggle } from "./features/cheatsheet/index.js";
import { sortedTabs } from "./features/tabLinks/store.js";
import { initKeybindListener } from "./features/keybinds/registry.js";
import { initGlobalContextMenu } from "./features/contextMenu/menus.js";
import { initLinkShortcutListener } from "./features/tabLinks/linkShortcuts.js";
import { initLaunchGroups } from "./features/launchGroups/index.js";

async function init() {
  const initialized = await isInitialized();
  const data = initialized ? await load() : await seedFromDefaults();
  setState(data);
  if (!state.activeTabId) {
    state.activeTabId = sortedTabs()[0]?.id ?? null;
  }
  console.log("[switchboard] initialized:", initialized, data);
  initKeybindListener();
  initLinkShortcutListener();
  initLaunchGroups(renderTabLinks);
  initGlobalContextMenu(renderTabLinks);
  render();
}

function render() {
  renderAmbient(document.body, state.settings);
  initSettingsToggle(document.body);
  initCheatsheetToggle(document.body);
  renderTabLinks();
}

function renderTabLinks() {
  renderTabs(document.body, renderTabLinks);
  renderLinks(document.body, renderTabLinks);
  renderSearch(document.body, renderTabLinks);
}

init();
