import { state } from "../../state.js";
import { save } from "../../storage.js";
import { buildRow, buildToggleSwitch } from "./controls.js";
import { buildDialogGroup } from "../dialog/chrome.js";

export function buildStatsSection() {
  const { element: toggle, input } = buildToggleSwitch(state.settings.statsEnabled, async (checked) => {
    state.settings.statsEnabled = checked;
    await save({ settings: state.settings });
  });
  const row = buildRow({ labelText: "Record fun stats", control: toggle });

  const { group } = buildDialogGroup({
    label: "Stats",
    rows: [row],
    note:
      "Counts link opens, searches, and tab use for recaps later. Everything stays on this " +
      "machine, and only goes elsewhere in exports you make yourself.",
  });

  function refresh() {
    input.checked = state.settings.statsEnabled;
  }

  return { element: group, refresh };
}
