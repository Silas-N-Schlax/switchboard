import { state } from "../../state.js";
import { save } from "../../storage.js";
import { createTab, createLink } from "../../schema.js";

function nextOrder(items) {
  return items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0;
}

function normalizeUrl(url) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}

export function sortedTabs() {
  return [...state.tabs].sort((a, b) => a.order - b.order);
}

export function linksForTab(tabId) {
  return state.links.filter((l) => l.tabId === tabId).sort((a, b) => a.order - b.order);
}

export function activeTab() {
  return state.tabs.find((t) => t.id === state.activeTabId) ?? sortedTabs()[0] ?? null;
}

export function setActiveTab(tabId) {
  state.activeTabId = tabId;
}

export async function addTab(name) {
  const tab = createTab({ id: crypto.randomUUID(), name, order: nextOrder(state.tabs) });
  state.tabs.push(tab);
  state.activeTabId = tab.id;
  await save({ tabs: state.tabs });
  return tab;
}

export async function deleteTab(tabId) {
  state.tabs = state.tabs.filter((t) => t.id !== tabId);
  state.links = state.links.filter((l) => l.tabId !== tabId);
  if (state.activeTabId === tabId) {
    state.activeTabId = sortedTabs()[0]?.id ?? null;
  }
  await save({ tabs: state.tabs, links: state.links });
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

export async function addLink(tabId, { label, url }) {
  const link = createLink({
    id: crypto.randomUUID(),
    label,
    url: normalizeUrl(url),
    tabId,
    order: nextOrder(linksForTab(tabId)),
  });
  state.links.push(link);
  await save({ links: state.links });
  return link;
}

export async function deleteLink(linkId) {
  state.links = state.links.filter((l) => l.id !== linkId);
  await save({ links: state.links });
}

export async function reorderLink(linkId, targetTabId, targetIndex) {
  const link = state.links.find((l) => l.id === linkId);
  if (!link) return;
  const sourceTabId = link.tabId;
  link.tabId = targetTabId;

  const targetLinks = linksForTab(targetTabId).filter((l) => l.id !== linkId);
  targetLinks.splice(targetIndex, 0, link);
  targetLinks.forEach((l, i) => {
    l.order = i;
  });

  if (sourceTabId !== targetTabId) {
    linksForTab(sourceTabId).forEach((l, i) => {
      l.order = i;
    });
  }

  await save({ links: state.links });
}
