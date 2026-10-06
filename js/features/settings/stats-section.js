import { state } from "../../state.js";
import { save } from "../../storage.js";
import { buildRow, buildToggleSwitch } from "./controls.js";
import { buildDialogGroup } from "../dialog/chrome.js";
import { loadStatsBuckets, clearStats } from "../stats/recorder.js";

function pluralize(count, word) {
  return `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;
}

async function confirmClearStats() {
  const buckets = Object.values(await loadStatsBuckets());
  const events = buckets.reduce((sum, events) => sum + events.length, 0);
  if (!events) {
    alert("There are no stats to clear.");
    return false;
  }
  const amount = `${pluralize(events, "event")} across ${pluralize(buckets.length, "month")}`;
  return (
    confirm(`Clear all your stats? That's ${amount}.`) &&
    confirm("Your recaps will start from nothing. Clear them anyway?") &&
    confirm("Last check: this can't be undone. Clear every stat for good?")
  );
}

export function buildStatsSection() {
  const { element: toggle, input } = buildToggleSwitch(state.settings.statsEnabled, async (checked) => {
    state.settings.statsEnabled = checked;
    await save({ settings: state.settings });
    updateClearRow();
  });
  const row = buildRow({ labelText: "Record fun stats", control: toggle });

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "settings-panel__action settings-panel__action--danger";
  clearButton.textContent = "Clear";
  clearButton.addEventListener("click", async () => {
    if (!(await confirmClearStats())) return;
    await clearStats();
    alert("Stats cleared.");
  });
  const clearRow = buildRow({ labelText: "Clear recorded stats", control: clearButton, tag: "div" });

  function updateClearRow() {
    clearRow.hidden = state.settings.statsEnabled;
  }

  const { group } = buildDialogGroup({
    label: "Stats",
    rows: [row, clearRow],
    note:
      "Counts link opens, searches, and tab use. Recaps to see them are coming soon. " +
      "Everything stays on this machine, and only goes elsewhere in exports you make yourself.",
  });

  function refresh() {
    input.checked = state.settings.statsEnabled;
    updateClearRow();
  }
  updateClearRow();

  return { element: group, refresh };
}
