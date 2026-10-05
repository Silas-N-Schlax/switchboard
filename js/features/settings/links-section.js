import { state } from "../../state.js";
import { save } from "../../storage.js";
import { buildRow, buildToggleSwitch } from "./controls.js";
import { buildDialogGroup } from "../dialog/chrome.js";
import {
  requestFaviconHistoryAccess,
  hasFaviconHistoryAccess,
  clearFaviconCache,
} from "../favicons/favicon.js";

export function buildLinksSection(onChange) {
  const { element: toggle, input } = buildToggleSwitch(state.settings.showFavicons, async (checked) => {
    // permissions.request only works inside the click's user gesture, so it must start
    // before anything is awaited.
    const access = checked ? requestFaviconHistoryAccess() : null;
    state.settings.showFavicons = checked;
    if (access) {
      await access;
      clearFaviconCache();
    }
    await save({ settings: state.settings });
    await updateAccessRow();
    onChange();
  });
  const row = buildRow({ labelText: "Show favicons", control: toggle });

  const allow = document.createElement("button");
  allow.type = "button";
  allow.className = "settings-panel__action";
  allow.textContent = "Allow";
  allow.addEventListener("click", async () => {
    if (!(await requestFaviconHistoryAccess())) return;
    clearFaviconCache();
    await updateAccessRow();
    onChange();
  });
  const accessRow = buildRow({ labelText: "Find icons in your history", control: allow, tag: "div" });

  async function updateAccessRow() {
    accessRow.hidden = !state.settings.showFavicons || (await hasFaviconHistoryAccess());
  }

  const { group } = buildDialogGroup({
    label: "Links",
    rows: [row, accessRow],
    note:
      "Icons come from your browser's own cache, matched against your history, so nothing " +
      "is fetched from the web. A site you haven't visited yet gets a placeholder until you do.",
  });

  function refresh() {
    input.checked = state.settings.showFavicons;
    updateAccessRow();
  }
  updateAccessRow();

  return { element: group, refresh };
}
