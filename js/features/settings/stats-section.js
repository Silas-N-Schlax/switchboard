import { state } from "../../state.js";
import { save } from "../../storage.js";
import { buildRow, buildToggleSwitch } from "./controls.js";

export function buildStatsSection() {
  const section = document.createElement("div");
  section.className = "settings-panel__section";
  const title = document.createElement("div");
  title.className = "settings-panel__section-title";
  title.textContent = "Stats";

  const { element: toggle, input } = buildToggleSwitch(state.settings.statsEnabled, async (checked) => {
    state.settings.statsEnabled = checked;
    await save({ settings: state.settings });
  });
  const row = buildRow({ labelText: "Record fun stats", control: toggle });

  const note = document.createElement("p");
  note.className = "settings-panel__note";
  note.textContent =
    "Counts link opens, searches, and tab use for recaps later. Everything stays on this " +
    "machine, and only goes elsewhere in exports you make yourself.";

  section.append(title, row, note);

  function refresh() {
    input.checked = state.settings.statsEnabled;
  }

  return { element: section, refresh };
}
