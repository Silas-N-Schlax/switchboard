import { state } from "../../state.js";
import { openContextMenu } from "./contextMenu.js";
import { openSettings } from "../settings/panel.js";
import { deleteLink, updateLink, duplicateLink, deleteTab, duplicateTab } from "../tabLinks/store.js";
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
          initial: { label: link.label, url: link.url },
          onSubmit: async ({ label, url }) => {
            await updateLink(link.id, { label, url });
            onChange();
          },
        }),
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
