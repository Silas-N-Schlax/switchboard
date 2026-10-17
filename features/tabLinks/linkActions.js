import { updateLink, addLink, activeTab, sortedTabs, tabTakesLinks } from "./store.js";
import { openLinkModal, openAddLinkModal } from "./linkModal.js";
import { showToast } from "../../shared/dialog/toast.js";
import { openInNewTabs } from "./openUrl.js";

// Every way of adding a link goes through here: the Add link tile, its key and the
// right-click menu. On a home tab that doesn't take links, the link goes to the next tab.
export function startAddLink(onChange) {
  const current = activeTab();
  const target = tabTakesLinks(current) ? current : sortedTabs()[1];
  if (!target) {
    showToast("Turn on Links on the home tab in Settings › Layout to add one here");
    return;
  }
  openAddLinkModal(document.body, async ({ label, url, shortcutKey }) => {
    await addLink(target.id, { label, url, shortcutKey });
    if (target.id !== current?.id) showToast(`Added to ${target.name}`, { tone: "success" });
    onChange();
  });
}

export function openUpdateLinkModal(link, onChange) {
  openLinkModal(document.body, {
    title: "Update link",
    submitLabel: "Save",
    initial: { id: link.id, label: link.label, url: link.url, shortcutKey: link.shortcutKey },
    onSubmit: async ({ label, url, shortcutKey }) => {
      await updateLink(link.id, { label, url, shortcutKey });
      onChange();
    },
  });
}

// window.open while Shift is held opens a new window, so go through the tabs API when it exists.
export function openLinkInNewTab(link) {
  return openInNewTabs([link.url], { activateFirst: true });
}

export async function copyLinkUrl(link, { toast = false } = {}) {
  try {
    await navigator.clipboard.writeText(link.url);
    if (toast) showToast("URL copied", { tone: "success" });
  } catch {
    if (toast) showToast("Couldn't copy the URL");
  }
}
