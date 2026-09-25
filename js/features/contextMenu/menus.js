import { state } from "../../state.js";
import { openContextMenu } from "./contextMenu.js";
import { openSettings } from "../settings/panel.js";
import {
  deleteLink,
  updateLink,
  duplicateLink,
  deleteTab,
  duplicateTab,
  activeTab,
} from "../tabLinks/store.js";
import {
  launchGroup,
  hasLaunchGroup,
  setLinkLaunchGroup,
  clearLaunchGroup,
  openLaunchGroupEditor,
} from "../launchGroups/index.js";
import { openLinkModal } from "../tabLinks/linkModal.js";
import { beginRenameTab } from "../tabLinks/renameState.js";
import { maxTabs } from "../../../defaults.js";

function linkMenuItems(link, onChange) {
  return [
    {
      label: "Open in new tab",
      onSelect: () => window.open(link.url, "_blank", "noopener"),
    },
    {
      label: "Update link",
      onSelect: () =>
        openLinkModal(document.body, {
          title: "Update link",
          submitLabel: "Save",
          initial: { id: link.id, label: link.label, url: link.url, shortcutKey: link.shortcutKey },
          onSubmit: async ({ label, url, shortcutKey }) => {
            await updateLink(link.id, { label, url, shortcutKey });
            onChange();
          },
        }),
    },
    {
      label: link.launchGroup ? "Remove from launch group" : "Add to launch group",
      onSelect: async () => {
        await setLinkLaunchGroup(link.id, !link.launchGroup);
        onChange();
      },
    },
    {
      label: "Copy link URL",
      onSelect: () => navigator.clipboard.writeText(link.url).catch(() => {}),
    },
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
      onSelect: async () => {
        await deleteLink(link.id);
        onChange();
      },
    },
  ];
}

function tabMenuItems(tab, onChange) {
  return [
    {
      label: "Rename",
      onSelect: () => beginRenameTab(tab.id, onChange),
    },
    {
      label: "Launch group",
      disabled: !hasLaunchGroup(tab.id),
      onSelect: () => launchGroup(tab.id),
    },
    {
      label: "Edit launch group…",
      onSelect: () => openLaunchGroupEditor(document.body, tab.id, onChange),
    },
    {
      label: "Clear launch group",
      disabled: !hasLaunchGroup(tab.id),
      onSelect: async () => {
        await clearLaunchGroup(tab.id);
        onChange();
      },
    },
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
      label: "Delete",
      disabled: state.tabs.length <= 1,
      onSelect: async () => {
        if (state.tabs.length <= 1) return;
        if (!confirm(`Delete tab "${tab.name}" and all its links?`)) return;
        await deleteTab(tab.id);
        onChange();
      },
    },
  ];
}

function launchBarMenuItems(tab, onChange) {
  return [
    { label: "Launch", onSelect: () => launchGroup(tab.id) },
    { label: "Edit…", onSelect: () => openLaunchGroupEditor(document.body, tab.id, onChange) },
    { divider: true },
    {
      label: "Clear launch group",
      onSelect: async () => {
        await clearLaunchGroup(tab.id);
        onChange();
      },
    },
  ];
}

function defaultMenuItems() {
  return [{ label: "Open settings", onSelect: () => openSettings(document.body) }];
}

// Every right-click resolves to exactly one of these three item sets — link
// and tab targets get their own menu, everything else falls back to default.
function resolveMenuItems(target, onChange) {
  const linkRow = target.closest(".link-list__row");
  if (linkRow) {
    const link = state.links.find((l) => l.id === linkRow.dataset.dragId);
    if (link) return linkMenuItems(link, onChange);
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
