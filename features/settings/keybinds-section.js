import { state } from "../../core/state.js";
import { updateSettings, applyDisplaySettings } from "./store.js";
import { buildRow, buildToggleSwitch } from "../../shared/controls/controls.js";
import { buildDialogGroup } from "../../shared/dialog/chrome.js";
import { openKeybindEditor } from "../keybinds/editor.js";

export function buildKeybindsSection(onChange) {
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "settings-panel__action";
  edit.textContent = "Edit…";
  edit.addEventListener("click", () => openKeybindEditor(onChange));
  const editRow = buildRow({ labelText: "Customize shortcuts", control: edit, tag: "div" });

  const { element: hintsToggle, input: hintsInput } = buildToggleSwitch(
    state.settings.showKeycapHints,
    async (showKeycapHints) => {
      await updateSettings({ showKeycapHints });
      applyDisplaySettings();
    }
  );
  const hintsRow = buildRow({ labelText: "Show keyboard hints", control: hintsToggle });

  const { group } = buildDialogGroup({
    label: "Keybinds",
    rows: [editRow, hintsRow],
    note:
      "Turning hints off hides the keycaps on tabs, links, the search bar, menus and dialog " +
      "footers. The shortcuts sheet (/) still lists every key.",
  });

  function refresh() {
    hintsInput.checked = state.settings.showKeycapHints;
  }

  return { element: group, refresh };
}
