import { state } from "../../state.js";
import { linksInGroup, sortedTabs } from "../tabLinks/store.js";
import { linkGroupsForTab } from "../linkGroups/store.js";
import { downloadFile, dateStamp } from "../importExport.js";
import { recordEvent, StatEvent } from "../stats/recorder.js";

export const wrapperFolderName = "Switchboard";

export function exportableTabs() {
  return sortedTabs().map((tab) => {
    const groups = linkGroupsForTab(tab.id);
    const linkCount = state.links.filter((l) => l.tabId === tab.id).length;
    return { tab, groups, linkCount };
  });
}

function toBookmark(link) {
  return { title: link.label, url: link.url };
}

// Main-list links come first, then each group in its on-page order, matching how a tab
// reads top to bottom.
function tabNodes({ tab, groups }, { groupFolders }) {
  const nodes = linksInGroup(tab.id, null).map(toBookmark);
  for (const group of groups) {
    const links = linksInGroup(tab.id, group.id).map(toBookmark);
    if (!links.length) continue;
    if (groupFolders) nodes.push({ title: group.name, children: links });
    else nodes.push(...links);
  }
  return nodes;
}

export function buildExportTree(rows, { wrap }) {
  const nodes = rows
    .filter((row) => row.include)
    .flatMap((row) => {
      const children = tabNodes(row.entry, row);
      if (!children.length) return [];
      return row.ownFolder ? [{ title: row.entry.tab.name, children }] : children;
    });
  return wrap && nodes.length ? [{ title: wrapperFolderName, children: nodes }] : nodes;
}

export function countBookmarks(nodes) {
  return nodes.reduce((sum, node) => sum + (node.url ? 1 : countBookmarks(node.children)), 0);
}

// The bookmark bar, Other bookmarks, and Mobile bookmarks, minus a managed folder an
// admin policy may add (it can't be written to).
export async function browserRootFolders() {
  const [root] = await chrome.bookmarks.getTree();
  return root.children.filter((node) => !node.url && !node.unmodifiable);
}

export function defaultRootFolder(roots) {
  return roots.find((r) => r.folderType === "other") ?? roots[1] ?? roots[0];
}

export function existingWrapper(rootFolder) {
  return rootFolder?.children?.find((node) => !node.url && node.title === wrapperFolderName) ?? null;
}

async function createNodes(parentId, nodes, failures, index) {
  for (const node of nodes) {
    try {
      if (node.url) {
        await chrome.bookmarks.create({ parentId, title: node.title, url: node.url, index });
      } else {
        const folder = await chrome.bookmarks.create({ parentId, title: node.title, index });
        await createNodes(folder.id, node.children, failures);
      }
    } catch {
      failures.push(node);
    }
    if (index !== undefined) index += 1;
  }
}

// The replacement is written before the old folder is removed, so a failure part way
// through never leaves the person with neither copy.
export async function writeToBrowser(nodes, { parentId, replaceId = null }) {
  const failures = [];
  let index;
  if (replaceId) [{ index }] = await chrome.bookmarks.get(replaceId);
  await createNodes(parentId, nodes, failures, index);
  if (replaceId) await chrome.bookmarks.removeTree(replaceId);
  const failed = countBookmarks(failures);
  const written = countBookmarks(nodes) - failed;
  recordEvent(StatEvent.bookmarksExport, { target: "browser", linkCount: written, replaced: !!replaceId });
  return { written, failed };
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function htmlLines(nodes, depth, stamp) {
  const pad = "    ".repeat(depth);
  return nodes.flatMap((node) => {
    if (node.url) return [`${pad}<DT><A HREF="${escapeHtml(node.url)}" ADD_DATE="${stamp}">${escapeHtml(node.title)}</A>`];
    return [
      `${pad}<DT><H3 ADD_DATE="${stamp}">${escapeHtml(node.title)}</H3>`,
      `${pad}<DL><p>`,
      ...htmlLines(node.children, depth + 1, stamp),
      `${pad}</DL><p>`,
    ];
  });
}

// The Netscape bookmark file format every major browser imports.
export function toBookmarksHtml(nodes) {
  const stamp = Math.floor(Date.now() / 1000);
  return [
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Bookmarks</TITLE>",
    "<H1>Bookmarks</H1>",
    "<DL><p>",
    ...htmlLines(nodes, 1, stamp),
    "</DL><p>",
    "",
  ].join("\n");
}

export function downloadBookmarksFile(nodes) {
  const blob = new Blob([toBookmarksHtml(nodes)], { type: "text/html" });
  downloadFile(blob, `switchboard-bookmarks-${dateStamp()}.html`);
  const written = countBookmarks(nodes);
  recordEvent(StatEvent.bookmarksExport, { target: "file", linkCount: written });
  return { written, failed: 0 };
}
