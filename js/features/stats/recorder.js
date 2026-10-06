import { state } from "../../state.js";
import { loadKey, loadAll, save, removeKeys } from "../../storage.js";

export const StatEvent = {
  newTab: "newtab",
  tabSwitch: "tab-switch",
  linkOpen: "link-open",
  search: "search",
  launch: "launch",
  linkAdd: "link-add",
  linkUpdate: "link-update",
  linkMove: "link-move",
  linkDelete: "link-delete",
  tabAdd: "tab-add",
  tabRename: "tab-rename",
  tabDelete: "tab-delete",
};

let queue = Promise.resolve();

export function statsBucketKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `stats:${date.getFullYear()}-${month}`;
}

// The bucket is re-read on every write rather than cached: several Switchboard tabs can
// be open at once, and a cached copy would let one tab overwrite events another just
// recorded. Writes are chained so callers can await them before navigating away.
export function recordEvent(type, data = {}) {
  if (!state.settings?.statsEnabled) return queue;
  const event = { t: Date.now(), type, ...data };
  queue = queue
    .then(async () => {
      const key = statsBucketKey(new Date(event.t));
      const events = (await loadKey(key)) ?? [];
      events.push(event);
      await save({ [key]: events });
    })
    .catch((err) => console.warn("[switchboard] stats write failed", err));
  return queue;
}

export const STATS_KEY_PATTERN = /^stats:\d{4}-\d{2}$/;

export async function loadStatsBuckets() {
  const all = await loadAll();
  return Object.fromEntries(Object.entries(all).filter(([key]) => STATS_KEY_PATTERN.test(key)));
}

export async function clearStats() {
  await queue;
  await removeKeys(Object.keys(await loadStatsBuckets()));
}

export function recordLinkOpen(link, via) {
  return recordEvent(StatEvent.linkOpen, { linkId: link.id, tabId: link.tabId, via });
}
