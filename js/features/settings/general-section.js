import { state } from "../../state.js";
import { updateSettings, applyDisplaySettings } from "./store.js";
import { buildRow, buildToggleSwitch, buildSelect } from "./controls.js";
import { createSwatchPicker } from "./swatch-picker.js";
import { buildDialogGroup } from "../dialog/chrome.js";
import { sortedTabs, defaultTab, setDefaultTab } from "../tabLinks/store.js";
import { searchEngines, searchFallbackSwatches } from "../../../defaults.js";

function tabOptions() {
  return sortedTabs().map((tab) => ({ value: tab.id, label: tab.name }));
}

export function buildGeneralSection(onChange) {
  const defaultTabSelect = buildSelect({
    options: tabOptions(),
    value: defaultTab()?.id,
    onChange: async (tabId) => {
      // Slot 1 is already the fallback default, so choosing it clears the setting.
      await setDefaultTab(tabId === sortedTabs()[0]?.id ? null : tabId);
      onChange();
    },
  });
  const defaultTabRow = buildRow({ labelText: "Default tab", control: defaultTabSelect.element });

  const engineSelect = buildSelect({
    options: searchEngines.map((engine) => ({ value: engine.id, label: engine.name })),
    value: state.settings.searchEngineId,
    onChange: (searchEngineId) => updateSettings({ searchEngineId }),
  });
  const engineRow = buildRow({ labelText: "Search engine", control: engineSelect.element });

  const fallbackPicker = createSwatchPicker({
    ariaLabel: "Web search border color",
    value: state.settings.searchFallbackColor,
    swatches: searchFallbackSwatches,
    onChange: async (searchFallbackColor) => {
      await updateSettings({ searchFallbackColor });
      onChange();
    },
  });
  const fallbackRow = buildRow({
    labelText: "Web search color",
    control: fallbackPicker.element,
    tag: "div",
  });

  const { element: hintsToggle, input: hintsInput } = buildToggleSwitch(
    state.settings.showKeycapHints,
    async (showKeycapHints) => {
      await updateSettings({ showKeycapHints });
      applyDisplaySettings();
    }
  );
  const hintsRow = buildRow({ labelText: "Show keyboard hints", control: hintsToggle });

  const { group } = buildDialogGroup({
    label: "General",
    rows: [defaultTabRow, engineRow, fallbackRow, hintsRow],
    note:
      "When nothing matches, Enter searches the web. The search bar takes the web search " +
      "color so you can tell before you press it.",
  });

  function refresh() {
    defaultTabSelect.setOptions(tabOptions(), defaultTab()?.id);
    engineSelect.setValue(state.settings.searchEngineId);
    fallbackPicker.setValue(state.settings.searchFallbackColor);
    hintsInput.checked = state.settings.showKeycapHints;
  }

  return { element: group, refresh };
}
