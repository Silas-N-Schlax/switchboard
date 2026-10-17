const unsupportedUrl = /^(javascript|data|place):/i;
const fileRootName = "Bookmarks";

export function hasChromeBookmarks() {
  return typeof chrome !== "undefined" && !!chrome.bookmarks;
}

// Vivaldi doesn't name itself in userAgentData, and Brave can hide its brand, so Brave is
// checked through navigator.brave and anything unrecognized is just "this browser".
export function browserName() {
  if (navigator.brave) return "Brave";
  const brands = navigator.userAgentData?.brands?.map((b) => b.brand) ?? [];
  if (brands.includes("Microsoft Edge")) return "Edge";
  if (brands.includes("Opera")) return "Opera";
  if (brands.includes("Google Chrome")) return "Chrome";
  return null;
}

function toLink(title, url) {
  return { title: (title ?? "").trim(), url: (url ?? "").trim() };
}

// Every folder is flattened to its own row holding only its direct links, so nesting
// survives as the path while each row maps cleanly onto one tab or link group.
function finish(folders) {
  let skipped = 0;
  const rows = folders
    .map((folder, index) => {
      const links = folder.links.filter((l) => l.url && !unsupportedUrl.test(l.url));
      skipped += folder.links.length - links.length;
      return { id: `folder-${index}`, name: folder.path.at(-1) ?? fileRootName, path: folder.path, links };
    })
    .filter((folder) => folder.links.length);
  return { folders: rows, skipped };
}

function readChromeNode(node, path, folders) {
  const folder = { path, links: [] };
  folders.push(folder);
  for (const child of node.children ?? []) {
    if (child.url) folder.links.push(toLink(child.title, child.url));
    else readChromeNode(child, [...path, child.title], folders);
  }
}

export async function readChromeBookmarks() {
  const [root] = await chrome.bookmarks.getTree();
  const folders = [];
  readChromeNode(root, [], folders);
  return finish(folders);
}

// Netscape bookmark files (what Chrome, Edge, Firefox, and Safari export) leave <p> and
// <dt> unclosed, so entries can land inside a stray <p> depending on the exporter.
function entriesOf(dl) {
  return [...dl.children].flatMap((child) => {
    if (child.tagName === "DT") return [child];
    if (child.tagName === "P") return [...child.children].filter((c) => c.tagName === "DT");
    return [];
  });
}

function readHtmlList(dl, path, folders) {
  const folder = { path, links: [] };
  folders.push(folder);
  for (const dt of entriesOf(dl)) {
    const anchor = dt.querySelector(":scope > a");
    const heading = dt.querySelector(":scope > h3");
    if (anchor) {
      folder.links.push(toLink(anchor.textContent, anchor.getAttribute("href")));
    } else if (heading) {
      const list = dt.querySelector(":scope > dl");
      if (list) readHtmlList(list, [...path, heading.textContent.trim()], folders);
    }
  }
}

export function parseBookmarksHtml(text) {
  const doc = new DOMParser().parseFromString(text, "text/html");
  const root = doc.querySelector("dl");
  if (!root) throw new Error("That file isn't a bookmarks export.");
  const folders = [];
  readHtmlList(root, [], folders);
  return finish(folders);
}

export async function readBookmarksFile(file) {
  return parseBookmarksHtml(await file.text());
}
