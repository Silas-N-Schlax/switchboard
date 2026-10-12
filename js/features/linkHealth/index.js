import { state } from "../../state.js";
import {
  LINK_HEALTH_KEY,
  checkUrls,
  hasLinkHealthAccess,
  requestLinkHealthAccess,
  clearLinkHealth,
} from "./check.js";

export { LinkIssue, requestLinkHealthAccess, hasLinkHealthAccess, clearLinkHealth } from "./check.js";

const hasStorage = typeof chrome !== "undefined" && !!chrome.storage;
let issues = {};

export async function initLinkHealth(onChange) {
  if (!hasStorage) return;
  ({ [LINK_HEALTH_KEY]: issues = {} } = await chrome.storage.local.get(LINK_HEALTH_KEY));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !(LINK_HEALTH_KEY in changes)) return;
    issues = changes[LINK_HEALTH_KEY].newValue ?? {};
    onChange();
  });
}

export function linkIssueFor(url) {
  if (!state.settings.checkLinkHealth) return null;
  return issues[url] ?? null;
}

export async function checkNewLink(url) {
  if (!state.settings.checkLinkHealth || !(await hasLinkHealthAccess())) return;
  await checkUrls([url]);
}

export function checkAllLinks() {
  return checkUrls(state.links.map((l) => l.url), { prune: true });
}
