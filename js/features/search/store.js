import { state } from "../../state.js";
import { sortedTabs, linkGroupIdOf } from "../tabLinks/store.js";

export function searchLinks(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const tabNames = new Map(sortedTabs().map((t) => [t.id, t.name]));
  const groupNames = new Map(state.linkGroups.map((g) => [g.id, g.name]));
  const placeName = (link) => {
    const tabName = tabNames.get(link.tabId) ?? "";
    const groupId = linkGroupIdOf(link);
    return groupId ? `${tabName} › ${groupNames.get(groupId)}` : tabName;
  };

  return state.links
    .map((link) => {
      const label = link.label.toLowerCase();
      const url = link.url.toLowerCase();
      let rank;
      if (label.startsWith(q)) rank = 0;
      else if (label.includes(q)) rank = 1;
      else if (url.includes(q)) rank = 2;
      else return null;
      return { link, tabName: placeName(link), rank };
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank || a.link.label.localeCompare(b.link.label));
}
