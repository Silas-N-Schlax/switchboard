import { state } from "../../core/state.js";
import { setDisabledKeybinds } from "../../shared/keybinds/registry.js";
import { tabSwitchIds } from "../../shared/keybinds/catalog.js";

// Keys that move between, add or remove tabs. They do nothing while Tabs is off.
const tabKeybindIds = [...tabSwitchIds, "tab-prev", "tab-next", "tab-new", "tab-duplicate", "tab-delete", "tab-set-default"];

// The switches that only hide things work through body classes (layout.css). Links on the
// home tab, the Add link button and the search bar are handled where those render.
export function applyLayout(root = document.body) {
  const { showTabs, showButtons } = state.settings;
  root.classList.toggle("layout--no-tabs", !showTabs);
  root.classList.toggle("layout--no-buttons", !showButtons);
  setDisabledKeybinds(showTabs ? [] : tabKeybindIds);
}
