import { state } from "../../state.js";
import { sortedTabs } from "../tabLinks/store.js";

export function searchLinks(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const tabNames = new Map(sortedTabs().map((t) => [t.id, t.name]));

  return state.links
    .map((link) => {
      const label = link.label.toLowerCase();
      const url = link.url.toLowerCase();
      let rank;
      if (label.startsWith(q)) rank = 0;
      else if (label.includes(q)) rank = 1;
      else if (url.includes(q)) rank = 2;
      else return null;
      return { link, tabName: tabNames.get(link.tabId) ?? "", rank };
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank || a.link.label.localeCompare(b.link.label));
}
