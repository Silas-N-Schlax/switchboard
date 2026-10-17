import { state } from "../../core/state.js";
import { updateSettings, applyDisplaySettings } from "../settings/store.js";
import { buildRow, buildToggleSwitch } from "../../shared/controls/controls.js";
import { buildDialogGroup } from "../../shared/dialog/chrome.js";
import { getKeybind } from "../../shared/keybinds/registry.js";
import { describeShortcut } from "../../shared/keybinds/shortcutFormat.js";
import { showToast } from "../../shared/dialog/toast.js";

// In the order people tend to strip things back, ending with the buttons.
const switches = [
  { key: "showHomeLinks", label: "Links on the home tab" },
  { key: "showAddLinkButton", label: "Add link button" },
  { key: "showTabs", label: "Tabs" },
  { key: "showSearchBar", label: "Search bar" },
  { key: "showButtons", label: "Buttons" },
];

// With the gear hidden, say once how to get back into Settings.
async function noticeSettingsPath() {
  if (state.settings.buttonsOffNoticeShown) return;
  const key = getKeybind("settings-open");
  showToast(key ? `Press ${describeShortcut(key)} or right-click to open Settings` : "Right-click the background to open Settings");
  await updateSettings({ buttonsOffNoticeShown: true });
}

export function buildLayoutSection(onChange) {
  const toggles = switches.map(({ key, label }) => {
    const { element, input } = buildToggleSwitch(state.settings[key], async (checked) => {
      await updateSettings({ [key]: checked });
      if (key === "showButtons" && !checked) await noticeSettingsPath();
      applyDisplaySettings();
      onChange();
    });
    return { key, input, row: buildRow({ labelText: label, control: element }) };
  });

  const { group } = buildDialogGroup({
    label: "Layout",
    rows: toggles.map(({ row }) => row),
    note:
      "With home links off, the home tab is just the search bar, and search still finds links " +
      "on every tab. Turning Tabs off keeps the other tabs' links; they come back with it. " +
      "A hidden search bar still opens with its key, and with Buttons off, right-click the " +
      "background for Settings.",
  });

  function refresh() {
    toggles.forEach(({ key, input }) => (input.checked = state.settings[key]));
  }

  return { element: group, refresh };
}
