import { state } from "../../state.js";
import { save } from "../../storage.js";
import { createTab, createLink, createLinkGroup } from "../../schema.js";
import { maxTabs } from "../../../defaults.js";
import { recordEvent, StatEvent } from "../stats/recorder.js";

function nextOrder(items) {
  return items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0;
}

export function normalizeUrl(url) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}

export function displayHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function displayUrl(url) {
  try {
    const { hostname, pathname, search, hash } = new URL(url);
    const path = pathname === "/" ? "" : pathname.replace(/\/$/, "");
    return hostname.replace(/^www\./, "") + path + search + hash;
  } catch {
    return url;
  }
}

export function sortedTabs() {
  return [...state.tabs].sort((a, b) => a.order - b.order);
}

export function linksForTab(tabId) {
  return state.links.filter((l) => l.tabId === tabId).sort((a, b) => a.order - b.order);
}

// A link whose group was removed (or belongs to another tab) falls back to the main list.
export function linkGroupIdOf(link) {
  const { groupId } = link;
  if (!groupId) return null;
  return state.linkGroups.some((g) => g.id === groupId && g.tabId === link.tabId) ? groupId : null;
}

export function linksInGroup(tabId, groupId) {
  return linksForTab(tabId).filter((l) => linkGroupIdOf(l) === groupId);
}

// Groups only exist to hold links, so one left empty by a move or delete goes away.
export function pruneEmptyLinkGroups() {
  const before = state.linkGroups.length;
  state.linkGroups = state.linkGroups.filter((g) =>
    state.links.some((l) => l.tabId === g.tabId && l.groupId === g.id)
  );
  return state.linkGroups.length !== before;
}

export function activeTab() {
  return state.tabs.find((t) => t.id === state.activeTabId) ?? sortedTabs()[0] ?? null;
}

// The tab in slot 1 (keybind "1") doubles as the search-first home view — see
// js/render/search.js and the "no add-link tile" guard in js/render/links.js.
export function isHomeTab(tab) {
  return !!tab && sortedTabs()[0]?.id === tab.id;
}

// Null (or a deleted tab's id) falls back to slot 1, so slot 1 is the default until
// another tab is explicitly chosen.
export function defaultTab() {
  return state.tabs.find((t) => t.id === state.settings.defaultTabId) ?? sortedTabs()[0] ?? null;
}

export function isExplicitDefaultTab(tab) {
  return !!tab && state.settings.defaultTabId === tab.id;
}

export async function setDefaultTab(tabId) {
  state.settings.defaultTabId = tabId;
  await save({ settings: state.settings });
}

export function setActiveTab(tabId, via) {
  if (tabId && tabId !== activeTab()?.id) recordEvent(StatEvent.tabSwitch, { tabId, via });
  state.activeTabId = tabId;
}

export async function addTab(name) {
  if (state.tabs.length >= maxTabs) return null;
  const tab = createTab({ id: crypto.randomUUID(), name, order: nextOrder(state.tabs) });
  state.tabs.push(tab);
  state.activeTabId = tab.id;
  await save({ tabs: state.tabs });
  recordEvent(StatEvent.tabAdd, { tabId: tab.id, name });
  return tab;
}

export async function updateTab(tabId, { name }) {
  const tab = state.tabs.find((t) => t.id === tabId);
  if (!tab) return;
  if (name === undefined || name === tab.name) return;
  tab.name = name;
  await save({ tabs: state.tabs });
  recordEvent(StatEvent.tabRename, { tabId, name });
}

export async function duplicateTab(tabId) {
  if (state.tabs.length >= maxTabs) return null;
  const source = state.tabs.find((t) => t.id === tabId);
  if (!source) return null;

  const tab = createTab({
    id: crypto.randomUUID(),
    name: `${source.name} copy`,
    order: nextOrder(state.tabs),
  });
  state.tabs.push(tab);

  const groupIdMap = new Map();
  const groups = state.linkGroups
    .filter((g) => g.tabId === tabId)
    .map((g) => {
      const copy = createLinkGroup({ id: crypto.randomUUID(), tabId: tab.id, name: g.name, order: g.order });
      groupIdMap.set(g.id, copy.id);
      return copy;
    });
  state.linkGroups.push(...groups);

  const links = linksForTab(tabId).map((l) =>
    createLink({
      id: crypto.randomUUID(),
      label: l.label,
      url: l.url,
      tabId: tab.id,
      groupId: groupIdMap.get(linkGroupIdOf(l)) ?? null,
      order: l.order,
    })
  );
  state.links.push(...links);
  state.activeTabId = tab.id;

  await save({ tabs: state.tabs, links: state.links, linkGroups: state.linkGroups });
  recordEvent(StatEvent.tabAdd, { tabId: tab.id, name: tab.name, via: "duplicate" });
  links.forEach((l) =>
    recordEvent(StatEvent.linkAdd, { linkId: l.id, tabId: tab.id, label: l.label, url: l.url, via: "duplicate" })
  );
  return tab;
}

export async function deleteTab(tabId) {
  const tab = state.tabs.find((t) => t.id === tabId);
  const removedLinks = linksForTab(tabId);
  state.tabs = state.tabs.filter((t) => t.id !== tabId);
  state.links = state.links.filter((l) => l.tabId !== tabId);
  state.linkGroups = state.linkGroups.filter((g) => g.tabId !== tabId);
  if (state.activeTabId === tabId) {
    state.activeTabId = sortedTabs()[0]?.id ?? null;
  }
  if (state.settings.defaultTabId === tabId) state.settings.defaultTabId = null;
  await save({ tabs: state.tabs, links: state.links, linkGroups: state.linkGroups, settings: state.settings });
  removedLinks.forEach((l) =>
    recordEvent(StatEvent.linkDelete, { linkId: l.id, tabId, label: l.label, url: l.url, via: "tab-delete" })
  );
  if (tab) recordEvent(StatEvent.tabDelete, { tabId, name: tab.name, linkCount: removedLinks.length });
}

export async function clearTab(tabId) {
  const removedLinks = linksForTab(tabId);
  state.links = state.links.filter((l) => l.tabId !== tabId);
  state.linkGroups = state.linkGroups.filter((g) => g.tabId !== tabId);
  await save({ links: state.links, linkGroups: state.linkGroups });
  removedLinks.forEach((l) =>
    recordEvent(StatEvent.linkDelete, { linkId: l.id, tabId, label: l.label, url: l.url, via: "tab-clear" })
  );
}

export async function reorderTab(tabId, targetIndex) {
  const tab = state.tabs.find((t) => t.id === tabId);
  if (!tab) return;
  const tabs = sortedTabs().filter((t) => t.id !== tabId);
  tabs.splice(targetIndex, 0, tab);
  tabs.forEach((t, i) => {
    t.order = i;
  });
  await save({ tabs: state.tabs });
}

export async function addLink(tabId, { label, url, shortcutKey = null }) {
  const link = createLink({
    id: crypto.randomUUID(),
    label,
    url: normalizeUrl(url),
    tabId,
    order: nextOrder(linksForTab(tabId)),
    shortcutKey,
  });
  state.links.push(link);
  await save({ links: state.links });
  recordEvent(StatEvent.linkAdd, { linkId: link.id, tabId, label: link.label, url: link.url });
  return link;
}

export async function updateLink(linkId, { label, url, shortcutKey }) {
  const link = state.links.find((l) => l.id === linkId);
  if (!link) return;
  if (label !== undefined) link.label = label;
  if (url !== undefined) link.url = normalizeUrl(url);
  if (shortcutKey !== undefined) link.shortcutKey = shortcutKey;
  await save({ links: state.links });
  recordEvent(StatEvent.linkUpdate, { linkId, label: link.label, url: link.url });
}

export async function duplicateLink(linkId) {
  const source = state.links.find((l) => l.id === linkId);
  if (!source) return null;

  const link = createLink({
    id: crypto.randomUUID(),
    label: `${source.label} copy`,
    url: source.url,
    tabId: source.tabId,
    groupId: linkGroupIdOf(source),
    order: nextOrder(linksForTab(source.tabId)),
  });
  state.links.push(link);
  await save({ links: state.links });
  recordEvent(StatEvent.linkAdd, { linkId: link.id, tabId: link.tabId, label: link.label, url: link.url, via: "duplicate" });
  return link;
}

export async function deleteLink(linkId) {
  const link = state.links.find((l) => l.id === linkId);
  state.links = state.links.filter((l) => l.id !== linkId);
  await save(pruneEmptyLinkGroups() ? { links: state.links, linkGroups: state.linkGroups } : { links: state.links });
  if (link) recordEvent(StatEvent.linkDelete, { linkId, tabId: link.tabId, label: link.label, url: link.url });
}

// targetGroupId of undefined keeps the link in its current group; null means the main list.
export async function reorderLink(linkId, targetTabId, targetIndex, targetGroupId) {
  const link = state.links.find((l) => l.id === linkId);
  if (!link) return;
  const sourceTabId = link.tabId;
  link.tabId = targetTabId;
  if (sourceTabId !== targetTabId) {
    link.launchGroup = false;
    link.launchOrder = null;
    link.groupId = null;
    link.order = nextOrder(linksForTab(targetTabId).filter((l) => l.id !== linkId));
  }
  if (targetGroupId !== undefined && targetGroupId !== linkGroupIdOf(link)) {
    link.groupId = targetGroupId;
    link.order = nextOrder(linksForTab(targetTabId).filter((l) => l.id !== linkId));
  }

  // Reusing the bucket's existing order slots keeps orders unique across the whole tab,
  // so the main list and every group can share one order sequence.
  const bucket = linksInGroup(targetTabId, linkGroupIdOf(link));
  const slots = bucket.map((l) => l.order);
  const targetLinks = bucket.filter((l) => l.id !== linkId);
  targetLinks.splice(targetIndex, 0, link);
  targetLinks.forEach((l, i) => {
    l.order = slots[i];
  });

  if (sourceTabId !== targetTabId) {
    linksForTab(sourceTabId).forEach((l, i) => {
      l.order = i;
    });
  }

  await save(pruneEmptyLinkGroups() ? { links: state.links, linkGroups: state.linkGroups } : { links: state.links });
  if (sourceTabId !== targetTabId) {
    recordEvent(StatEvent.linkMove, { linkId, fromTabId: sourceTabId, toTabId: targetTabId });
  }
}
