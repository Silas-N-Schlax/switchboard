import { load, isInitialized, seedFromDefaults } from "./storage.js";
import { setState, state } from "./state.js";
import { renderAmbient } from "../features/ambient/ambient.js";
import { renderTabs } from "../features/tabLinks/renderTabs.js";
import { renderLinks } from "../features/tabLinks/renderLinks.js";
import { renderSearch, focusSearchBar } from "../features/search/render.js";
import { initSettingsToggle } from "../features/settings/index.js";
import { applyDisplaySettings } from "../features/settings/store.js";
import { initCheatsheetToggle } from "../features/cheatsheet/index.js";
import { defaultTab } from "../features/tabLinks/store.js";
import { initKeybindListener } from "../shared/keybinds/registry.js";
import { initGlobalContextMenu } from "../features/contextMenu/menus.js";
import { initLinkShortcutListener } from "../features/tabLinks/linkShortcuts.js";
import { noticeShortcutClashes } from "../features/tabLinks/shortcutClashNotice.js";
import { initLinkTabbing } from "../features/tabLinks/linkTabbing.js";
import { initLaunchGroups } from "../features/launchGroups/index.js";
import { initActionKeybinds } from "../features/tabLinks/actionKeybinds.js";
import { initLinkHealth } from "../features/linkHealth/index.js";
import { recordEvent, StatEvent } from "../features/stats/recorder.js";

async function init() {
  const initialized = await isInitialized();
  const data = initialized ? await load() : await seedFromDefaults();
  setState(data);
  if (!state.activeTabId) {
    state.activeTabId = defaultTab()?.id ?? null;
  }
  recordEvent(StatEvent.newTab, { tabId: state.activeTabId });
  initKeybindListener();
  initLinkShortcutListener();
  initLinkTabbing();
  initLaunchGroups(renderTabLinks);
  initActionKeybinds(renderTabLinks);
  initGlobalContextMenu(renderTabLinks);
  await initLinkHealth(renderTabLinks);
  render();
  if (state.settings.focusPageOnOpen && state.settings.focusSearchOnOpen) focusSearchBar();
  noticeShortcutClashes();
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

init();
