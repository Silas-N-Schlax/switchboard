import { state } from "../../state.js";
import { save } from "../../storage.js";
import { createLinkGroup } from "../../schema.js";
import { linksForTab, linksInGroup, pruneEmptyLinkGroups } from "../tabLinks/store.js";

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
  if (!link || !canAddLinkGroup(link.tabId)) return null;
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
