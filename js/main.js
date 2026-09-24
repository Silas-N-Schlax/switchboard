import { load, isInitialized, seedFromDefaults } from "./storage.js";
import { setState, state } from "./state.js";
import { renderAmbient } from "./render/ambient.js";
import { renderTabs } from "./render/tabs.js";
import { renderLinks } from "./render/links.js";
import { initSettingsToggle } from "./features/settings/index.js";
import { sortedTabs } from "./features/tabLinks/store.js";
import { initKeybindListener } from "./features/keybinds/registry.js";
import { initGlobalContextMenu } from "./features/contextMenu/menus.js";

async function init() {
  const initialized = await isInitialized();
  const data = initialized ? await load() : await seedFromDefaults();
  setState(data);
  if (!state.activeTabId) {
    state.activeTabId = sortedTabs()[0]?.id ?? null;
  }
  console.log("[switchboard] initialized:", initialized, data);
  initKeybindListener();
  initGlobalContextMenu(renderTabLinks);
  render();
}

function render() {
  renderAmbient(document.body, state.settings);
  initSettingsToggle(document.body);
  renderTabLinks();
  // TODO: render search bar
}

function renderTabLinks() {
  renderTabs(document.body, renderTabLinks);
  renderLinks(document.body, renderTabLinks);
}

init();
