import { confirmDialog, typedConfirmDialog } from "../dialog/confirm.js";
import { clearTabPhrase } from "../../../defaults.js";
import { linksForTab } from "./store.js";

export function confirmTabDelete(tab) {
  const count = linksForTab(tab.id).length;
  const message =
    count === 0
      ? "This tab has no links, so only the tab goes."
      : `This also deletes its ${count === 1 ? "link" : `${count} links`}. Export a backup first if you might want ${count === 1 ? "it" : "them"} back.`;
  return confirmDialog({
    title: `Delete “${tab.name}”?`,
    message,
    confirmLabel: "Delete tab",
    danger: true,
  });
}

export function confirmTabClear(tab) {
  const count = linksForTab(tab.id).length;
  const them = count === 1 ? "it" : "them";
  return typedConfirmDialog({
    title: `Clear “${tab.name}”?`,
    message:
      `This deletes ${count === 1 ? "its link" : `all ${count} of its links`} and any link groups, ` +
      `but keeps the tab. Export a backup first if you might want ${them} back.`,
    phrase: clearTabPhrase,
    confirmLabel: "Clear links",
  });
}
