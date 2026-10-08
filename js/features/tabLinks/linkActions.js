import { updateLink } from "./store.js";
import { openLinkModal } from "./linkModal.js";
import { showToast } from "../dialog/toast.js";
import { openInNewTabs } from "./openUrl.js";

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
