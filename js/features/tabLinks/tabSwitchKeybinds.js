import { sortedTabs, setActiveTab } from "./store.js";
import { registerKeybind, unregisterKeybind } from "../keybinds/registry.js";
import { maxTabs } from "../../../defaults.js";

// Re-run on every tab render: tabs can be added/removed/reordered, so the
// 1-9 slots need to keep pointing at whichever tab currently sits in that
// position rather than a fixed tab id.
export function registerTabSwitchKeybinds(onChange) {
  const tabs = sortedTabs();
  for (let i = 0; i < maxTabs; i++) {
    const id = `tab-switch-${i + 1}`;
    const tab = tabs[i];
    if (!tab) {
      unregisterKeybind(id);
      continue;
    }
    registerKeybind(id, {
      description: `Switch to tab ${i + 1} (${tab.name})`,
      handler: () => {
        setActiveTab(tab.id);
        onChange();
      },
    });
  }
}
