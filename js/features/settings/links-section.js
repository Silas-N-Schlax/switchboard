import { state } from "../../state.js";
import { save } from "../../storage.js";
import { buildRow, buildToggleSwitch, buildSelect } from "./controls.js";
import { buildDialogGroup } from "../dialog/chrome.js";
import {
  requestFaviconHistoryAccess,
  hasFaviconHistoryAccess,
  clearFaviconCache,
} from "../favicons/favicon.js";
import { linkListSplitThresholdOptions } from "../../../defaults.js";

function buildSettingToggle(labelText, key, onChange) {
  const { element, input } = buildToggleSwitch(state.settings[key], async (checked) => {
    state.settings[key] = checked;
    await save({ settings: state.settings });
    onChange();
  });
  const row = buildRow({ labelText, control: element });
  function refresh() {
    input.checked = state.settings[key];
  }
  return { row, refresh };
}

export function buildLinksSection(onChange) {
  const newTab = buildSettingToggle("Open links in a new tab", "openLinksInNewTab", onChange);
  const fullUrl = buildSettingToggle("Show full URL", "showFullUrl", onChange);

  const splitSelect = buildSelect({
    options: linkListSplitThresholdOptions.map((count) => ({
      value: count,
      label: count === null ? "Never" : `${count} links`,
    })),
    value: state.settings.linkListSplitThreshold,
    onChange: async (linkListSplitThreshold) => {
      state.settings.linkListSplitThreshold = linkListSplitThreshold;
      await save({ settings: state.settings });
      onChange();
    },
  });
  const splitRow = buildRow({ labelText: "Two columns from", control: splitSelect.element });

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
    rows: [newTab.row, fullUrl.row, splitRow, row, accessRow],
    note:
      "Two columns only show on wide windows. Favicons come from your browser's own cache, matched against your history, so nothing " +
      "is fetched from the web. A site you haven't visited yet gets a placeholder until you do.",
  });

  function refresh() {
    newTab.refresh();
    fullUrl.refresh();
    splitSelect.setValue(state.settings.linkListSplitThreshold);
    input.checked = state.settings.showFavicons;
    updateAccessRow();
  }
  updateAccessRow();

  return { element: group, refresh };
}
