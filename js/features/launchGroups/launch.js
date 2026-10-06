import { activeTab } from "../tabLinks/store.js";
import { registerKeybind } from "../keybinds/registry.js";
import { launchGroupLinks } from "./store.js";
import { openLaunchGroupEditor } from "./editor.js";
import { recordEvent, recordLinkOpen, StatEvent } from "../stats/recorder.js";
import { opensInNewTab, openInNewTabs } from "../tabLinks/openUrl.js";

async function openInOrder(links) {
  const urls = links.map((link) => link.url);
  if (opensInNewTab()) {
    await openInNewTabs(urls, { activateFirst: true });
    return;
  }
  const [first, ...rest] = urls;
  await openInNewTabs(rest);
  window.location.href = first;
}

export async function launchGroup(tabId = activeTab()?.id) {
  if (!tabId) return;
  const links = launchGroupLinks(tabId);
  if (!links.length) return;
  recordEvent(StatEvent.launch, { tabId, count: links.length });
  await Promise.all(links.map((link) => recordLinkOpen(link, "launch")));
  await openInOrder(links);
}

export function initLaunchGroups(onChange) {
  registerKeybind("launch-group", {
    description: "Launch this tab's launch group",
    handler: () => launchGroup(),
  });
  registerKeybind("launch-group-edit", {
    description: "Edit this tab's launch group",
    handler: () => {
      const tab = activeTab();
      if (tab) openLaunchGroupEditor(document.body, tab.id, onChange);
    },
  });
}
