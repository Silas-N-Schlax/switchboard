import { faviconFetchSize, faviconHistoryCandidateLimit } from "../../../defaults.js";

const resolved = new Map();
const pending = new Map();
let defaultIconBytes = null;

function hasFaviconApi() {
  return typeof chrome !== "undefined" && !!chrome.runtime?.id;
}

function faviconUrl(pageUrl) {
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", pageUrl);
  url.searchParams.set("size", String(faviconFetchSize));
  return url.toString();
}

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`favicon ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Chrome's _favicon endpoint never 404s — a page it has no icon for gets the generic
// globe. Fetching that globe once for a page that can't exist lets us spot it and show
// our own fallback instead.
function loadDefaultIconBytes() {
  defaultIconBytes ??= fetchBytes(faviconUrl("https://switchboard.invalid/")).catch(() => null);
  return defaultIconBytes;
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

// Good enough for picking sibling hosts (app.slack.com → slack.com) without shipping a
// public-suffix list; two-letter country TLDs like .co.uk keep three labels.
function baseDomain(host) {
  const parts = host.split(".");
  const keep = parts.length > 2 && parts.at(-1).length === 2 && parts.at(-2).length <= 3 ? 3 : 2;
  return parts.slice(-keep).join(".");
}

// Chrome stores icons per exact page visited, so a link to a site's root usually has no
// icon even after plenty of visits deeper in the site. With the optional history
// permission, the most-visited pages on the same host stand in for it, then pages on
// sibling subdomains of the same site.
async function historyCandidates(pageUrl) {
  if (!chrome.history?.search) return [];
  const host = hostnameOf(pageUrl);
  if (!host) return [];
  const base = baseDomain(host);
  const items = await chrome.history.search({ text: base, startTime: 0, maxResults: 200 });
  const byVisits = (a, b) => (b.visitCount ?? 0) - (a.visitCount ?? 0);
  const visited = items.filter((item) => item.url !== pageUrl);
  const sameHost = visited.filter((item) => hostnameOf(item.url) === host).sort(byVisits);
  const sameSite = visited
    .filter((item) => {
      const h = hostnameOf(item.url);
      return h && h !== host && (h === base || h.endsWith(`.${base}`));
    })
    .sort(byVisits);
  return [
    ...sameHost.slice(0, faviconHistoryCandidateLimit),
    ...sameSite.slice(0, faviconHistoryCandidateLimit),
  ].map((item) => item.url);
}

async function resolveFavicon(pageUrl) {
  const globe = await loadDefaultIconBytes();
  const candidates = [pageUrl, ...(await historyCandidates(pageUrl).catch(() => []))];
  for (const candidate of candidates) {
    const src = faviconUrl(candidate);
    try {
      const bytes = await fetchBytes(src);
      if (!globe || !sameBytes(bytes, globe)) return src;
    } catch {}
  }
  return null;
}

export function clearFaviconCache() {
  resolved.clear();
}

export async function hasFaviconHistoryAccess() {
  if (typeof chrome === "undefined" || !chrome.permissions?.contains) return false;
  return chrome.permissions.contains({ permissions: ["history"] }).catch(() => false);
}

export function requestFaviconHistoryAccess() {
  if (typeof chrome === "undefined" || !chrome.permissions?.request) return Promise.resolve(false);
  return chrome.permissions.request({ permissions: ["history"] }).catch(() => false);
}

function buildFallback() {
  const fallback = document.createElement("img");
  fallback.className = "favicon favicon--missing";
  fallback.src = "graphics/favicon/favicon.svg";
  fallback.alt = "";
  fallback.width = 16;
  fallback.height = 16;
  fallback.draggable = false;
  return fallback;
}

function buildImage(src, slot, pageUrl) {
  const img = document.createElement("img");
  img.className = "favicon";
  img.src = src;
  img.alt = "";
  img.width = 16;
  img.height = 16;
  img.draggable = false;
  img.decoding = "async";
  img.addEventListener("error", () => {
    resolved.set(pageUrl, null);
    slot.replaceChildren(buildFallback());
  });
  return img;
}

export function buildFavicon(pageUrl, className) {
  const slot = document.createElement("span");
  slot.className = className;

  const known = resolved.get(pageUrl);
  if (known) {
    slot.appendChild(buildImage(known, slot, pageUrl));
    return slot;
  }
  slot.appendChild(buildFallback());
  if (known === null || !hasFaviconApi()) return slot;

  if (!pending.has(pageUrl)) {
    pending.set(
      pageUrl,
      resolveFavicon(pageUrl).then((src) => {
        resolved.set(pageUrl, src);
        pending.delete(pageUrl);
        return src;
      })
    );
  }
  pending.get(pageUrl).then((src) => {
    if (src && slot.isConnected) slot.replaceChildren(buildImage(src, slot, pageUrl));
  });
  return slot;
}
