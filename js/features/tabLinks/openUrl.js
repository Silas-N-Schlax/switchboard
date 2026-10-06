import { state } from "../../state.js";

const hasTabsApi = typeof chrome !== "undefined" && !!chrome.tabs?.create;

export function opensInNewTab() {
  return !!state.settings.openLinksInNewTab;
}

export async function openInNewTabs(urls, { activateFirst = false } = {}) {
  if (!hasTabsApi) {
    urls.forEach((url) => window.open(url, "_blank", "noopener"));
    return;
  }
  const current = await chrome.tabs.getCurrent();
  for (const [i, url] of urls.entries()) {
    await chrome.tabs.create({
      url,
      active: activateFirst && i === 0,
      ...(current ? { index: current.index + 1 + i, windowId: current.windowId } : {}),
    });
  }
}

export async function openUrl(url) {
  if (opensInNewTab()) return openInNewTabs([url], { activateFirst: true });
  window.location.href = url;
}
