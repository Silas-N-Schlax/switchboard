import { state } from "../../core/state.js";
import { save } from "../../core/storage.js";
import { createLinkGroup } from "../../core/schema.js";
import { linksForTab, linksInGroup, linkGroupIdOf, pruneEmptyLinkGroups, reorderLink } from "../tabLinks/store.js";
import { recordEvent, StatEvent } from "../stats/recorder.js";

const newLinkGroupName = "New group";

function nextOrder(items) {
  return items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0;
}

export function linkGroupsForTab(tabId) {
  return state.linkGroups.filter((g) => g.tabId === tabId).sort((a, b) => a.order - b.order);
}

export function canAddLinkGroup(tabId) {
  return linkGroupsForTab(tabId).length < state.settings.linkGroupLimit;
}

// A link that is alone in its group frees that group's slot when it leaves, so it can
// still start a new group at the limit.
export function canMoveLinkToNewGroup(link) {
  if (canAddLinkGroup(link.tabId)) return true;
  const groupId = linkGroupIdOf(link);
  return !!groupId && linksInGroup(link.tabId, groupId).length === 1;
}

function placeAtEndOfGroup(link, groupId) {
  link.order = nextOrder(linksForTab(link.tabId));
  link.groupId = groupId;
}

export async function moveLinkToGroup(linkId, groupId) {
  const link = state.links.find((l) => l.id === linkId);
  if (!link) return;
  placeAtEndOfGroup(link, groupId);
  pruneEmptyLinkGroups();
  await save({ links: state.links, linkGroups: state.linkGroups });
}

export async function addLinkGroupWithLink(linkId) {
  const link = state.links.find((l) => l.id === linkId);
  if (!link || !canMoveLinkToNewGroup(link)) return null;
  const group = createLinkGroup({
    id: crypto.randomUUID(),
    tabId: link.tabId,
    name: newLinkGroupName,
    order: nextOrder(linkGroupsForTab(link.tabId)),
  });
  state.linkGroups.push(group);
  placeAtEndOfGroup(link, group.id);
  pruneEmptyLinkGroups();
  await save({ links: state.links, linkGroups: state.linkGroups });
  return group;
}

// A group moving to another tab doesn't take a slot it already holds there.
export function canMoveLinkGroupTo(group, tabId) {
  return group.tabId === tabId || canAddLinkGroup(tabId);
}

// groupId is null for the main list, an existing group's id, or { name } to start a new
// group in the target tab. position is "top" or "bottom" of that list.
export async function moveLink(linkId, { tabId, groupId, position }) {
  const link = state.links.find((l) => l.id === linkId);
  if (!link) return;
  let targetGroupId = groupId;
  if (groupId && typeof groupId === "object") {
    const group = createLinkGroup({
      id: crypto.randomUUID(),
      tabId,
      name: groupId.name || newLinkGroupName,
      order: nextOrder(linkGroupsForTab(tabId)),
    });
    state.linkGroups.push(group);
    targetGroupId = group.id;
  }
  const bucket = linksInGroup(tabId, targetGroupId).filter((l) => l.id !== linkId);
  await reorderLink(linkId, tabId, position === "top" ? 0 : bucket.length, targetGroupId);
  await save({ linkGroups: state.linkGroups });
}

export async function moveLinkGroup(groupId, tabId, index) {
  const group = state.linkGroups.find((g) => g.id === groupId);
  if (!group || !canMoveLinkGroupTo(group, tabId)) return;
  const sourceTabId = group.tabId;
  const moved = linksInGroup(sourceTabId, groupId);

  if (sourceTabId !== tabId) {
    // Launch groups belong to a tab, so links leave theirs when they change tabs.
    let order = nextOrder(linksForTab(tabId));
    moved.forEach((l) => {
      l.tabId = tabId;
      l.launchGroup = false;
      l.launchOrder = null;
      l.order = order++;
    });
    group.tabId = tabId;
    linkGroupsForTab(sourceTabId).forEach((g, i) => {
      g.order = i;
    });
  }

  const groups = linkGroupsForTab(tabId).filter((g) => g.id !== groupId);
  groups.splice(Math.min(index, groups.length), 0, group);
  groups.forEach((g, i) => {
    g.order = i;
  });
  await save({ links: state.links, linkGroups: state.linkGroups });
  if (sourceTabId !== tabId) {
    moved.forEach((l) =>
      recordEvent(StatEvent.linkMove, { linkId: l.id, fromTabId: sourceTabId, toTabId: tabId, via: "group-move" })
    );
  }
}

export async function renameLinkGroup(groupId, name) {
  const group = state.linkGroups.find((g) => g.id === groupId);
  if (!group || !name || name === group.name) return;
  group.name = name;
  await save({ linkGroups: state.linkGroups });
}

export async function shiftLinkGroup(groupId, delta) {
  const group = state.linkGroups.find((g) => g.id === groupId);
  if (!group) return;
  const groups = linkGroupsForTab(group.tabId);
  const from = groups.indexOf(group);
  const to = from + delta;
  if (to < 0 || to >= groups.length) return;
  groups.splice(from, 1);
  groups.splice(to, 0, group);
  groups.forEach((g, i) => {
    g.order = i;
  });
  await save({ linkGroups: state.linkGroups });
}

export async function ungroupLinkGroup(groupId) {
  const group = state.linkGroups.find((g) => g.id === groupId);
  if (!group) return;
  linksInGroup(group.tabId, groupId).forEach((l) => placeAtEndOfGroup(l, null));
  state.linkGroups = state.linkGroups.filter((g) => g.id !== groupId);
  await save({ links: state.links, linkGroups: state.linkGroups });
}
