import { focusPageOnOpen } from "../defaults.js";

const focusParam = "focus";

// Chrome always gives a freshly opened New Tab override's keyboard focus to the address
// bar, leaving every keybind dead until a click. A navigation started by the page itself
// hands focus to the page; one started through chrome.tabs.update does not, so this has
// to stay a document.location redirect (see https://github.com/philc/vimium/issues/4741).
// It runs before the app is imported, so the page that gets thrown away loads only this.
async function shouldRedirectForPageFocus() {
  const isExtension = typeof chrome !== "undefined" && !!chrome.storage;
  if (!isExtension || new URLSearchParams(location.search).has(focusParam)) return false;
  try {
    const { settings } = await chrome.storage.local.get("settings");
    return settings?.focusPageOnOpen ?? focusPageOnOpen;
  } catch (err) {
    console.warn("[switchboard] couldn't read the focus setting", err);
    return false;
  }
}

if (await shouldRedirectForPageFocus()) {
  document.location.href = `${location.pathname}?${focusParam}`;
} else {
  import("./main.js");
}
