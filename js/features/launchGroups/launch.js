import { activeTab } from "../tabLinks/store.js";
import { registerKeybind } from "../keybinds/registry.js";
import { launchGroupLinks } from "./store.js";
import { openLaunchGroupEditor } from "./editor.js";

const hasTabsApi = typeof chrome !== "undefined" && !!chrome.tabs?.create;

async function openInOrder(links) {
  const [first, ...rest] = links;
  if (hasTabsApi) {
    const current = await chrome.tabs.getCurrent();
    for (const [i, link] of rest.entries()) {
      await chrome.tabs.create({
        url: link.url,
        active: false,
        ...(current ? { index: current.index + 1 + i, windowId: current.windowId } : {}),
      });
    }
  } else {
    rest.forEach((link) => window.open(link.url, "_blank", "noopener"));
  }
  window.location.href = first.url;
}

export async function launchGroup(tabId = activeTab()?.id) {
  if (!tabId) return;
  const links = launchGroupLinks(tabId);
  if (!links.length) return;
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
