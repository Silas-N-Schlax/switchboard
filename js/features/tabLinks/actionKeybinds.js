import { state } from "../../state.js";
import { registerKeybind } from "../keybinds/registry.js";
import {
  activeTab,
  sortedTabs,
  setActiveTab,
  deleteLink,
  reorderLink,
  addLink,
  linksInGroup,
  linkGroupIdOf,
} from "./store.js";
import { beginRenameTab } from "./renameState.js";
import { openAddLinkModal } from "./linkModal.js";
import { openUpdateLinkModal, openLinkInNewTab, copyLinkUrl } from "./linkActions.js";
import { showToast } from "../dialog/toast.js";
import { maxTabs } from "../../../defaults.js";

function focusedLinkRow() {
  return document.activeElement?.closest?.(".link-list__row") ?? null;
}

function focusedLink() {
  const id = focusedLinkRow()?.dataset.linkId;
  return id ? state.links.find((l) => l.id === id) ?? null : null;
}

function hasFocusedLink() {
  return focusedLink() !== null;
}

// Search results render without a drag id; their order isn't the link's real order.
function hasMovableFocusedLink() {
  return hasFocusedLink() && !!focusedLinkRow().dataset.dragId;
}

function linkLabels() {
  return [...document.querySelectorAll(".link-list .link-list__label")];
}

function focusLink(linkId) {
  document.querySelector(`.link-list__row[data-link-id="${linkId}"] .link-list__label`)?.focus();
}

function stepTab(delta, onChange) {
  const tabs = sortedTabs();
  if (tabs.length < 2) return;
  const index = tabs.findIndex((t) => t.id === activeTab()?.id);
  const next = tabs[(index + delta + tabs.length) % tabs.length];
  setActiveTab(next.id, "key");
  onChange();
}

async function moveFocusedLink(delta, onChange) {
  const link = focusedLink();
  const bucket = linksInGroup(link.tabId, linkGroupIdOf(link));
  const index = bucket.findIndex((l) => l.id === link.id);
  const target = index + delta;
  if (target < 0 || target >= bucket.length) return;
  await reorderLink(link.id, link.tabId, target);
  onChange();
  focusLink(link.id);
}

async function deleteFocusedLink(onChange) {
  const link = focusedLink();
  const labels = linkLabels();
  const index = labels.indexOf(document.activeElement);
  await deleteLink(link.id);
  onChange();
  const remaining = linkLabels();
  remaining[Math.min(index, remaining.length - 1)]?.focus();
}

export function initActionKeybinds(onChange) {
  registerKeybind("tab-prev", { description: "Previous tab", handler: () => stepTab(-1, onChange) });
  registerKeybind("tab-next", { description: "Next tab", handler: () => stepTab(1, onChange) });
  registerKeybind("tab-new", {
    description: "New tab",
    handler: () => {
      const add = document.querySelector(".tab-dock__add");
      if (add) add.click();
      else showToast(`You already have the most tabs (${maxTabs})`);
    },
  });
  registerKeybind("tab-rename", {
    description: "Rename this tab",
    handler: () => {
      const tab = activeTab();
      if (tab) beginRenameTab(tab.id, onChange);
    },
  });
  registerKeybind("link-new", {
    description: "New link on this tab",
    handler: () => {
      const tabId = activeTab()?.id;
      if (!tabId) return;
      openAddLinkModal(document.body, async ({ label, url, shortcutKey }) => {
        await addLink(tabId, { label, url, shortcutKey });
        onChange();
      });
    },
  });

  registerKeybind("link-edit", {
    description: "Edit the selected link",
    when: hasFocusedLink,
    handler: () => openUpdateLinkModal(focusedLink(), onChange),
  });
  registerKeybind("link-delete", {
    description: "Delete the selected link",
    when: hasFocusedLink,
    handler: () => deleteFocusedLink(onChange),
  });
  registerKeybind("link-copy-url", {
    description: "Copy the selected link's URL",
    when: hasFocusedLink,
    handler: () => copyLinkUrl(focusedLink(), { toast: true }),
  });
  registerKeybind("link-open-new-tab", {
    description: "Open the selected link in a new tab",
    when: hasFocusedLink,
    handler: () => openLinkInNewTab(focusedLink()),
  });
  registerKeybind("link-move-up", {
    description: "Move the selected link up",
    when: hasMovableFocusedLink,
    handler: () => moveFocusedLink(-1, onChange),
  });
  registerKeybind("link-move-down", {
    description: "Move the selected link down",
    when: hasMovableFocusedLink,
    handler: () => moveFocusedLink(1, onChange),
  });
}
