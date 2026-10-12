import {
  checkLinkHealth,
  linkHealthTimeoutMs,
  linkHealthConcurrency,
} from "../../../defaults.js";

export const LINK_HEALTH_KEY = "linkHealth";
export const LinkIssue = { notFound: "not-found", unreachable: "unreachable" };

const HOST_ORIGINS = ["http://*/*", "https://*/*"];
const NOT_FOUND_STATUSES = [404, 410];
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]$)|\.(local|localhost|test|internal)$/;

const hasChrome = typeof chrome !== "undefined" && !!chrome.permissions;

export function hasLinkHealthAccess() {
  if (!hasChrome) return Promise.resolve(false);
  return chrome.permissions.contains({ origins: HOST_ORIGINS }).catch(() => false);
}

export function requestLinkHealthAccess() {
  if (!hasChrome) return Promise.resolve(false);
  return chrome.permissions.request({ origins: HOST_ORIGINS }).catch(() => false);
}

export function isCheckableUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return (protocol === "http:" || protocol === "https:") && !PRIVATE_HOST.test(hostname);
  } catch {
    return false;
  }
}

async function request(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), linkHealthTimeoutMs);
  try {
    const response = await fetch(url, {
      method,
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    });
    return response.status;
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

// Returns { status } when the server answered, { unreachable: true } when the request
// failed outright (DNS, refused, TLS), or null when it timed out.
async function probe(url) {
  try {
    const status = await request(url, "HEAD");
    if (![...NOT_FOUND_STATUSES, 405, 501].includes(status)) return { status };
    // Some servers reject or mishandle HEAD, so a GET confirms before a link is flagged.
    return { status: await request(url, "GET") };
  } catch (err) {
    if (err.name === "AbortError") return null;
    return { unreachable: true };
  }
}

function issueFrom(result) {
  if (result.unreachable) return { reason: LinkIssue.unreachable };
  if (NOT_FOUND_STATUSES.includes(result.status)) return { reason: LinkIssue.notFound, status: result.status };
  return null;
}

async function inPool(items, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(linkHealthConcurrency, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift());
  });
  await Promise.all(runners);
}

async function loadIssues() {
  const { [LINK_HEALTH_KEY]: issues } = await chrome.storage.local.get(LINK_HEALTH_KEY);
  return issues ?? {};
}

// Re-reads before writing so a create-time check and the daily run can't drop each
// other's results.
async function saveResults(issueByUrl, keepUrls = null) {
  const current = await loadIssues();
  const next = keepUrls
    ? Object.fromEntries(Object.entries(current).filter(([url]) => keepUrls.has(url)))
    : { ...current };
  for (const [url, issue] of Object.entries(issueByUrl)) {
    if (issue) next[url] = { ...issue, since: current[url]?.since ?? Date.now() };
    else delete next[url];
  }
  if (JSON.stringify(next) !== JSON.stringify(current)) {
    await chrome.storage.local.set({ [LINK_HEALTH_KEY]: next });
  }
  return next;
}

export async function checkUrls(urls, { prune = false } = {}) {
  const unique = new Set(urls);
  const checkable = [...unique].filter(isCheckableUrl);
  const results = {};
  await inPool(checkable, async (url) => {
    const result = await probe(url);
    if (result) results[url] = result;
  });

  // If nothing answered at all, the connection is the problem, not the links.
  const anyAnswered = Object.values(results).some((r) => !r.unreachable);
  const online = typeof navigator === "undefined" || navigator.onLine !== false;
  const issueByUrl = {};
  for (const [url, result] of Object.entries(results)) {
    if (result.unreachable && (!online || (checkable.length > 1 && !anyAnswered))) continue;
    issueByUrl[url] = issueFrom(result);
  }

  const issues = await saveResults(issueByUrl, prune ? unique : null);
  return [...unique].filter((url) => issues[url]).length;
}

export async function runScheduledLinkCheck() {
  const { settings, links } = await chrome.storage.local.get(["settings", "links"]);
  if (!(settings?.checkLinkHealth ?? checkLinkHealth)) return;
  if (!(await hasLinkHealthAccess())) return;
  await checkUrls((links ?? []).map((l) => l.url), { prune: true });
}

export async function clearLinkHealth() {
  if (hasChrome) await chrome.storage.local.remove(LINK_HEALTH_KEY);
}
