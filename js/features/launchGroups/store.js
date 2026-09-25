import { state } from "../../state.js";
import { save } from "../../storage.js";
import { linksForTab } from "../tabLinks/store.js";

// Links flagged before launchOrder was tracked have a null launchOrder — they fall
// back to display order behind any explicitly ordered links.
export function launchGroupLinks(tabId) {
  return linksForTab(tabId)
    .filter((l) => l.launchGroup)
    .sort((a, b) => (a.launchOrder ?? Infinity) - (b.launchOrder ?? Infinity) || a.order - b.order);
}

export function hasLaunchGroup(tabId) {
  return state.links.some((l) => l.tabId === tabId && l.launchGroup);
}

function renumber(links) {
  links.forEach((l, i) => {
    l.launchOrder = i;
  });
}

export async function setLinkLaunchGroup(linkId, enabled) {
  const link = state.links.find((l) => l.id === linkId);
  if (!link) return;
  const group = launchGroupLinks(link.tabId).filter((l) => l.id !== linkId);
  link.launchGroup = enabled;
  link.launchOrder = null;
  renumber(enabled ? [...group, link] : group);
  await save({ links: state.links });
}

export async function reorderLaunchGroup(tabId, linkId, targetIndex) {
  const group = launchGroupLinks(tabId);
  const link = group.find((l) => l.id === linkId);
  if (!link) return;
  const rest = group.filter((l) => l.id !== linkId);
  rest.splice(Math.max(0, Math.min(targetIndex, rest.length)), 0, link);
  renumber(rest);
  await save({ links: state.links });
}

export async function clearLaunchGroup(tabId) {
  state.links.forEach((l) => {
    if (l.tabId !== tabId) return;
    l.launchGroup = false;
    l.launchOrder = null;
  });
  await save({ links: state.links });
}
