import { state } from "../../core/state.js";
import { save } from "../../core/storage.js";
import { buildRow, buildToggleSwitch, buildSelect, buildNumberInput } from "../../shared/controls/controls.js";
import { buildDialogGroup } from "../../shared/dialog/chrome.js";
import {
  requestFaviconHistoryAccess,
  hasFaviconHistoryAccess,
  clearFaviconCache,
} from "../favicons/favicon.js";
import {
  requestLinkHealthAccess,
  checkAllLinks,
  clearLinkHealth,
} from "../linkHealth/index.js";
import { showToast } from "../../shared/dialog/toast.js";
import { linkListSplitThresholdOptions, linkGroupLimitRange } from "../../defaults.js";

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

  const { min: groupLimitMin, max: groupLimitMax } = linkGroupLimitRange;
  const groupLimitInput = buildNumberInput({
    min: groupLimitMin,
    max: groupLimitMax,
    value: state.settings.linkGroupLimit,
    onChange: async (linkGroupLimit) => {
      state.settings.linkGroupLimit = linkGroupLimit;
      await save({ settings: state.settings });
      onChange();
    },
  });
  const groupLimitRow = buildRow({ labelText: "Link groups per tab", control: groupLimitInput.element });

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

  const { element: healthToggle, input: healthInput } = buildToggleSwitch(
    state.settings.checkLinkHealth,
    async (checked) => {
      // Same user-gesture rule as the favicon prompt above.
      const access = checked ? requestLinkHealthAccess() : null;
      if (access && !(await access)) {
        healthInput.checked = false;
        return;
      }
      state.settings.checkLinkHealth = checked;
      await save({ settings: state.settings });
      if (!checked) await clearLinkHealth();
      updateCheckNowRow();
      onChange();
      if (checked) checkAllLinks();
    }
  );
  const healthRow = buildRow({ labelText: "Check links daily", control: healthToggle });

  const checkNow = document.createElement("button");
  checkNow.type = "button";
  checkNow.className = "settings-panel__action";
  checkNow.textContent = "Check";
  // aria-disabled instead of disabled: a disabled button drops focus out of the panel,
  // and then Esc no longer reaches it.
  checkNow.addEventListener("click", async () => {
    if (checkNow.getAttribute("aria-disabled") === "true") return;
    checkNow.setAttribute("aria-disabled", "true");
    checkNow.textContent = "Checking…";
    try {
      const broken = await checkAllLinks();
      showToast(
        broken ? `${broken} ${broken === 1 ? "link" : "links"} couldn't be reached` : "All links are reachable",
        { tone: broken ? "error" : "success" }
      );
    } finally {
      checkNow.removeAttribute("aria-disabled");
      checkNow.textContent = "Check";
    }
  });
  const checkNowRow = buildRow({ labelText: "Check links now", control: checkNow, tag: "div" });

  function updateCheckNowRow() {
    checkNowRow.hidden = !state.settings.checkLinkHealth;
  }

  const { group } = buildDialogGroup({
    label: "Links",
    rows: [newTab.row, fullUrl.row, splitRow, groupLimitRow, row, accessRow, healthRow, checkNowRow],
    note:
      "Two columns only show on wide windows. Lowering the group limit keeps existing groups and only stops new ones. Favicons come from your browser's own cache, matched against your history, so nothing " +
      "is fetched from the web. A site you haven't visited yet gets a placeholder until you do. " +
      "Daily link checks visit each saved link from your browser once a day and mark any that are " +
      "missing (404) or can't be reached.",
  });

  function refresh() {
    newTab.refresh();
    fullUrl.refresh();
    splitSelect.setValue(state.settings.linkListSplitThreshold);
    groupLimitInput.setValue(state.settings.linkGroupLimit);
    input.checked = state.settings.showFavicons;
    healthInput.checked = state.settings.checkLinkHealth;
    updateAccessRow();
    updateCheckNowRow();
  }
  updateAccessRow();
  updateCheckNowRow();

  return { element: group, refresh };
}
