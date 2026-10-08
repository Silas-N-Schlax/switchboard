import { state } from "../../state.js";
import { openContextMenu } from "./contextMenu.js";
import { openSettings } from "../settings/panel.js";
import { openCheatsheet } from "../cheatsheet/index.js";
import { getKeybind } from "../keybinds/registry.js";
import { confirmTabDelete, confirmTabClear } from "../tabLinks/confirmTabDelete.js";
import {
  deleteLink,
  duplicateLink,
  deleteTab,
  clearTab,
  duplicateTab,
  activeTab,
  linksForTab,
  isHomeTab,
  defaultTab,
  isExplicitDefaultTab,
  setDefaultTab,
  linkGroupIdOf,
} from "../tabLinks/store.js";
import {
  linkGroupsForTab,
  canAddLinkGroup,
  moveLinkToGroup,
  addLinkGroupWithLink,
  shiftLinkGroup,
  ungroupLinkGroup,
  beginRenameLinkGroup,
} from "../linkGroups/index.js";
import {
  launchGroup,
  hasLaunchGroup,
  setLinkLaunchGroup,
  clearLaunchGroup,
  openLaunchGroupEditor,
} from "../launchGroups/index.js";
import { openUpdateLinkModal, openLinkInNewTab, copyLinkUrl } from "../tabLinks/linkActions.js";
import { beginRenameTab } from "../tabLinks/renameState.js";
import { maxTabs } from "../../../defaults.js";

function linkGroupMenuItems(link, onChange) {
  const currentGroupId = linkGroupIdOf(link);
  const moveTo = (groupId) => async () => {
    await moveLinkToGroup(link.id, groupId);
    onChange();
  };
  const items = linkGroupsForTab(link.tabId)
    .filter((g) => g.id !== currentGroupId)
    .map((g) => ({ label: `Move to ${g.name}`, onSelect: moveTo(g.id) }));
  if (currentGroupId) items.push({ label: "Move to main list", onSelect: moveTo(null) });
  items.push({
    label: "Move to new group",
    disabled: !canAddLinkGroup(link.tabId),
    onSelect: async () => {
      const group = await addLinkGroupWithLink(link.id);
      if (group) beginRenameLinkGroup(group.id, onChange);
    },
  });
  return items;
}

function linkMenuItems(link, onChange) {
  return [
    {
      label: "Open in new tab",
      hint: getKeybind("link-open-new-tab"),
      onSelect: () => openLinkInNewTab(link),
    },
    {
      label: "Copy URL",
      hint: getKeybind("link-copy-url"),
      onSelect: () => copyLinkUrl(link),
    },
    { divider: true },
    {
      label: "Update link…",
      hint: getKeybind("link-edit"),
      onSelect: () => openUpdateLinkModal(link, onChange),
    },
    {
      label: link.launchGroup ? "Remove from launch group" : "Add to launch group",
      onSelect: async () => {
        await setLinkLaunchGroup(link.id, !link.launchGroup);
        onChange();
      },
    },
    { divider: true },
    ...linkGroupMenuItems(link, onChange),
    { divider: true },
    {
      label: "Duplicate",
      onSelect: async () => {
        await duplicateLink(link.id);
        onChange();
      },
    },
    { divider: true },
    {
      label: "Delete",
      hint: getKeybind("link-delete"),
      danger: true,
      onSelect: async () => {
        await deleteLink(link.id);
        onChange();
      },
    },
  ];
}

function defaultTabMenuItem(tab, onChange) {
  if (isExplicitDefaultTab(tab)) {
    return {
      label: "Remove as default",
      onSelect: async () => {
        await setDefaultTab(null);
        onChange();
      },
    };
  }
  return {
    label: "Set as default",
    disabled: defaultTab()?.id === tab.id,
    onSelect: async () => {
      await setDefaultTab(isHomeTab(tab) ? null : tab.id);
      onChange();
    },
  };
}

// Keybinds act on the active tab, so a hint is only truthful on that tab's menu.
function activeTabHint(tab, keybindId) {
  return activeTab()?.id === tab.id ? getKeybind(keybindId) : null;
}

function tabMenuItems(tab, onChange) {
  return [
    {
      label: "Rename",
      hint: activeTabHint(tab, "tab-rename"),
      onSelect: () => beginRenameTab(tab.id, onChange),
    },
    defaultTabMenuItem(tab, onChange),
    { divider: true },
    {
      label: "Launch group",
      hint: activeTabHint(tab, "launch-group"),
      disabled: !hasLaunchGroup(tab.id),
      onSelect: () => launchGroup(tab.id),
    },
    {
      label: "Edit launch group…",
      hint: activeTabHint(tab, "launch-group-edit"),
      onSelect: () => openLaunchGroupEditor(document.body, tab.id, onChange),
    },
    {
      label: "Clear launch group",
      danger: true,
      disabled: !hasLaunchGroup(tab.id),
      onSelect: async () => {
        await clearLaunchGroup(tab.id);
        onChange();
      },
    },
    { divider: true },
    {
      label: "Duplicate",
      disabled: state.tabs.length >= maxTabs,
      onSelect: async () => {
        await duplicateTab(tab.id);
        onChange();
      },
    },
    { divider: true },
    {
      label: "Clear links…",
      danger: true,
      disabled: linksForTab(tab.id).length === 0,
      onSelect: async () => {
        if (!(await confirmTabClear(tab))) return;
        await clearTab(tab.id);
        onChange();
      },
    },
    {
      label: "Delete",
      danger: true,
      disabled: state.tabs.length <= 1,
      onSelect: async () => {
        if (state.tabs.length <= 1) return;
        if (!(await confirmTabDelete(tab))) return;
        await deleteTab(tab.id);
        onChange();
      },
    },
  ];
}

function groupMenuItems(group, onChange) {
  const groups = linkGroupsForTab(group.tabId);
  const index = groups.findIndex((g) => g.id === group.id);
  return [
    { label: "Rename", onSelect: () => beginRenameLinkGroup(group.id, onChange) },
    {
      label: "Move left",
      disabled: index <= 0,
      onSelect: async () => {
        await shiftLinkGroup(group.id, -1);
        onChange();
      },
    },
    {
      label: "Move right",
      disabled: index >= groups.length - 1,
      onSelect: async () => {
        await shiftLinkGroup(group.id, 1);
        onChange();
      },
    },
    { divider: true },
    {
      label: "Ungroup",
      onSelect: async () => {
        await ungroupLinkGroup(group.id);
        onChange();
      },
    },
  ];
}

function launchBarMenuItems(tab, onChange) {
  return [
    { label: "Launch", hint: getKeybind("launch-group"), onSelect: () => launchGroup(tab.id) },
    {
      label: "Edit…",
      hint: getKeybind("launch-group-edit"),
      onSelect: () => openLaunchGroupEditor(document.body, tab.id, onChange),
    },
    { divider: true },
    {
      label: "Clear launch group",
      danger: true,
      onSelect: async () => {
        await clearLaunchGroup(tab.id);
        onChange();
      },
    },
  ];
}

function defaultMenuItems() {
  return [
    { label: "Settings", hint: getKeybind("settings-open"), onSelect: () => openSettings(document.body) },
    {
      label: "Keyboard shortcuts",
      hint: getKeybind("cheatsheet-open"),
      onSelect: () => openCheatsheet(document.body),
    },
  ];
}

// Every right-click resolves to exactly one item set — links, group labels, the launch
// bar, and tabs get their own menu, everything else falls back to default.
function resolveMenuItems(target, onChange) {
  const linkRow = target.closest(".link-list__row");
  if (linkRow) {
    const link = state.links.find((l) => l.id === linkRow.dataset.dragId);
    if (link) return linkMenuItems(link, onChange);
  }

  const groupLabel = target.closest(".link-group__label");
  if (groupLabel) {
    const group = state.linkGroups.find((g) => g.id === groupLabel.closest(".link-group").dataset.groupId);
    if (group) return groupMenuItems(group, onChange);
  }

  if (target.closest(".launch-bar")) {
    const tab = activeTab();
    if (tab) return launchBarMenuItems(tab, onChange);
  }

  const tabEl = target.closest(".tab-dock__tab");
  if (tabEl) {
    const tab = state.tabs.find((t) => t.id === tabEl.dataset.dragId);
    if (tab) return tabMenuItems(tab, onChange);
  }

  return defaultMenuItems();
}

let initialized = false;

export function initGlobalContextMenu(onChange) {
  if (initialized) return;
  initialized = true;
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, resolveMenuItems(e.target, onChange));
  });
}
