import { state } from "../../state.js";
import { updateSettings, applyDisplaySettings } from "./store.js";
import { buildRow, buildToggleSwitch, buildSelect } from "./controls.js";
import { createSwatchPicker } from "./swatch-picker.js";
import { buildDialogGroup } from "../dialog/chrome.js";
import { sortedTabs, defaultTab, setDefaultTab } from "../tabLinks/store.js";
import { searchEngines, searchFallbackSwatches, interfaceFontOptions, monoFontOptions } from "../../../defaults.js";

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

  function buildFontSelect(options, key) {
    return buildSelect({
      options: options.map((option) => ({ value: option.id, label: option.label })),
      value: state.settings[key],
      onChange: async (id) => {
        await updateSettings({ [key]: id });
        applyDisplaySettings();
      },
    });
  }
  const interfaceFontSelect = buildFontSelect(interfaceFontOptions, "interfaceFont");
  const interfaceFontRow = buildRow({ labelText: "Interface font", control: interfaceFontSelect.element });
  const monoFontSelect = buildFontSelect(monoFontOptions, "monoFont");
  const monoFontRow = buildRow({ labelText: "Mono font", control: monoFontSelect.element });

  const { element: focusToggle, input: focusInput } = buildToggleSwitch(
    state.settings.focusPageOnOpen,
    async (focusPageOnOpen) => {
      await updateSettings({ focusPageOnOpen });
      updateSearchFocusRow();
    }
  );
  const focusRow = buildRow({ labelText: "Focus page instead of address bar", control: focusToggle });

  const { element: searchFocusToggle, input: searchFocusInput } = buildToggleSwitch(
    state.settings.focusSearchOnOpen,
    (focusSearchOnOpen) => updateSettings({ focusSearchOnOpen })
  );
  const searchFocusRow = buildRow({ labelText: "Focus search bar on open", control: searchFocusToggle });

  function updateSearchFocusRow() {
    searchFocusRow.hidden = !state.settings.focusPageOnOpen;
  }

  const { group } = buildDialogGroup({
    label: "General",
    rows: [defaultTabRow, engineRow, fallbackRow, interfaceFontRow, monoFontRow, focusRow, searchFocusRow],
    note:
      "When nothing matches, Enter searches the web. The search bar takes the web search " +
      "color so you can tell before you press it. Focusing the page lets shortcuts work the " +
      "moment a tab opens, but the address bar then shows the extension's URL. The mono " +
      "font is used for URLs and key hints.",
  });

  function refresh() {
    defaultTabSelect.setOptions(tabOptions(), defaultTab()?.id);
    engineSelect.setValue(state.settings.searchEngineId);
    fallbackPicker.setValue(state.settings.searchFallbackColor);
    interfaceFontSelect.setValue(state.settings.interfaceFont);
    monoFontSelect.setValue(state.settings.monoFont);
    focusInput.checked = state.settings.focusPageOnOpen;
    searchFocusInput.checked = state.settings.focusSearchOnOpen;
    updateSearchFocusRow();
  }
  updateSearchFocusRow();

  return { element: group, refresh };
}
