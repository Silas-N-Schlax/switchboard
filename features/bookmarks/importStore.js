import { state } from "../../core/state.js";
import { save } from "../../core/storage.js";
import { createTab, createLink, createLinkGroup } from "../../core/schema.js";
import { linksForTab, normalizeUrl, displayHost, pruneEmptyLinkGroups, sortedTabs } from "../tabLinks/store.js";
import { linkGroupsForTab } from "../linkGroups/store.js";
import { maxTabs } from "../../defaults.js";
import { recordEvent, StatEvent } from "../stats/recorder.js";

export const defaultNewTabName = "Bookmarks";

export function tabDestination(tabId) {
  return `tab:${tabId}`;
}

export function newTabDestination(name) {
  return `new:${name}`;
}

export function newTabRoom() {
  return maxTabs - state.tabs.length;
}

function nextOrder(items) {
  return items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0;
}

function sameName(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function targetOf(row) {
  if (row.destination.startsWith("new:")) {
    const name = row.destination.slice("new:".length);
    return { key: `new:${name.trim().toLowerCase()}`, name };
  }
  const tabId = row.destination.slice("tab:".length);
  const tab = state.tabs.find((t) => t.id === tabId);
  return { key: row.destination, name: tab?.name ?? "", tabId };
}

// Keyed by lowercased name, so "work" and "Work" become one new tab.
export function pendingNewTabs(rows, exceptRow = null) {
  const names = new Map();
  for (const row of rows) {
    if (!row.include || row === exceptRow) continue;
    const target = targetOf(row);
    if (!target.tabId && !names.has(target.key)) names.set(target.key, target.name);
  }
  return names;
}

// Reuses a "Bookmarks" tab from an earlier import instead of making a second one.
export function defaultDestination() {
  const bookmarksTab = state.tabs.find((t) => sameName(t.name, defaultNewTabName));
  if (bookmarksTab) return tabDestination(bookmarksTab.id);
  if (newTabRoom() > 0) return newTabDestination(defaultNewTabName);
  return tabDestination((state.tabs.find((t) => t.id === state.activeTabId) ?? sortedTabs()[0]).id);
}

export function importProblems(rows) {
  const included = rows.filter((r) => r.include);
  const problems = [];

  const newTabCount = pendingNewTabs(rows).size;
  const room = newTabRoom();
  if (newTabCount > room) {
    problems.push(
      room
        ? `That makes ${newTabCount} new tabs, but there's only room for ${room} more (Switchboard holds ${maxTabs}).`
        : `Switchboard already has ${maxTabs} tabs, so send these folders to an existing tab.`
    );
  }

  const limit = state.settings.linkGroupLimit;
  const targets = new Map();
  for (const row of included.filter((r) => r.asGroup)) {
    const target = targetOf(row);
    const existing = target.tabId ? linkGroupsForTab(target.tabId) : [];
    if (existing.some((g) => sameName(g.name, row.folder.name))) continue;
    const entry = targets.get(target.key) ?? { name: target.name, existing: existing.length, names: new Set() };
    entry.names.add(row.folder.name.trim().toLowerCase());
    targets.set(target.key, entry);
  }
  for (const { name, existing, names } of targets.values()) {
    const total = existing + names.size;
    if (total > limit) {
      problems.push(
        `“${name}” would end up with ${total} link groups, but tabs hold ${limit}. Turn off ` +
          "Link group on a few folders, or raise the limit in Settings › Links."
      );
    }
  }
  return problems;
}

function linkGroupFor(tabId, name) {
  const existing = linkGroupsForTab(tabId).find((g) => sameName(g.name, name));
  if (existing) return existing;
  const group = createLinkGroup({
    id: crypto.randomUUID(),
    tabId,
    name,
    order: nextOrder(linkGroupsForTab(tabId)),
  });
  state.linkGroups.push(group);
  return group;
}

export async function importBookmarks(rows, source) {
  const newTabs = new Map();
  const knownUrls = new Map();
  const orders = new Map();
  let added = 0;
  let duplicates = 0;

  function resolveTab(row) {
    const target = targetOf(row);
    if (target.tabId) return state.tabs.find((t) => t.id === target.tabId);
    if (!newTabs.has(target.key)) {
      const tab = createTab({ id: crypto.randomUUID(), name: target.name, order: nextOrder(state.tabs) });
      state.tabs.push(tab);
      newTabs.set(target.key, tab);
    }
    return newTabs.get(target.key);
  }

  for (const row of rows.filter((r) => r.include)) {
    const tab = resolveTab(row);
    if (!tab) continue;
    if (!knownUrls.has(tab.id)) {
      const existing = linksForTab(tab.id);
      knownUrls.set(tab.id, new Set(existing.map((l) => l.url)));
      orders.set(tab.id, nextOrder(existing));
    }
    const known = knownUrls.get(tab.id);
    const groupId = row.asGroup ? linkGroupFor(tab.id, row.folder.name).id : null;

    for (const bookmark of row.folder.links) {
      const url = normalizeUrl(bookmark.url);
      if (known.has(url)) {
        duplicates += 1;
        continue;
      }
      known.add(url);
      const order = orders.get(tab.id);
      orders.set(tab.id, order + 1);
      state.links.push(
        createLink({ id: crypto.randomUUID(), label: bookmark.title || displayHost(url), url, tabId: tab.id, groupId, order })
      );
      added += 1;
    }
  }

  pruneEmptyLinkGroups();
  await save({ tabs: state.tabs, links: state.links, linkGroups: state.linkGroups });
  newTabs.forEach((tab) => recordEvent(StatEvent.tabAdd, { tabId: tab.id, name: tab.name, via: "bookmarks-import" }));
  recordEvent(StatEvent.bookmarksImport, { source, linkCount: added, duplicates, newTabCount: newTabs.size });
  return { added, duplicates, newTabs: [...newTabs.values()] };
}
