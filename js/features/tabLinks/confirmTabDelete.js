import { confirmDialog } from "../dialog/confirm.js";
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
