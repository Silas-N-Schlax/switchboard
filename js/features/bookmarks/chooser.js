import { openDialog } from "../dialog/confirm.js";
import { browserName } from "./tree.js";

export const BookmarkTarget = { browser: "browser", file: "file" };

export function chooseImportSource() {
  const name = browserName();
  return openDialog({
    title: "Import bookmarks",
    message:
      `Pull them straight from ${name ?? "this browser"}, or pick a bookmarks file exported from ` +
      "another browser. Chrome, Brave, Edge, Vivaldi, Firefox, and Safari can all export one " +
      "from their bookmark manager.",
    buttons: [
      { text: "Cancel", variant: "ghost", result: null },
      { text: "From a file", variant: "ghost", result: BookmarkTarget.file },
      { text: name ? `From ${name}` : "From this browser", variant: "primary", result: BookmarkTarget.browser },
    ],
    role: "dialog",
  });
}

export function chooseExportTarget() {
  const name = browserName();
  return openDialog({
    title: "Export bookmarks",
    message:
      `Add your tabs straight to ${name ?? "this browser"}'s bookmarks (where sync can carry them ` +
      "to your phone), or download a bookmarks file to import into another browser.",
    buttons: [
      { text: "Cancel", variant: "ghost", result: null },
      { text: "Download a file", variant: "ghost", result: BookmarkTarget.file },
      { text: name ? `Add to ${name}` : "Add to this browser", variant: "primary", result: BookmarkTarget.browser },
    ],
    role: "dialog",
  });
}
