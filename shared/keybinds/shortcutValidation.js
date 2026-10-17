import { state } from "../../core/state.js";
import { getKeybind } from "./registry.js";
import { comparableShortcut } from "./shortcutFormat.js";
import { keybindActions, keybindLabel } from "./catalog.js";
import { reservedSystemShortcuts } from "../../defaults.js";

function isReserved(comparable) {
  return reservedSystemShortcuts.some((reserved) => comparableShortcut(reserved) === comparable);
}

// What already owns a key, checked against every app action (bound or not registered
// yet, like tab slots past the last tab), every link shortcut, and a curated
// (best-effort, never exhaustive) list of browser/OS shortcuts. Null when it's free.
export function findKeyOwner(candidate, { excludeActionId = null, excludeLinkId = null } = {}) {
  const comparable = comparableShortcut(candidate);
  if (!comparable) return null;

  const action = keybindActions.find(
    (a) => a.id !== excludeActionId && comparableShortcut(getKeybind(a.id)) === comparable
  );
  if (action) return { type: "app", id: action.id, label: keybindLabel(action.id) };

  const link = state.links.find(
    (l) => l.id !== excludeLinkId && l.shortcutKey && comparableShortcut(l.shortcutKey) === comparable
  );
  if (link) return { type: "link", link, label: `the link "${link.label}"` };

  if (isReserved(comparable)) return { type: "system", label: "your browser or OS" };
  return null;
}

export function findShortcutConflict(candidate, { excludeLinkId = null } = {}) {
  const owner = findKeyOwner(candidate, { excludeLinkId });
  if (!owner) return null;
  if (owner.type === "link") return { type: "link", message: `Already used by "${owner.link.label}"` };
  if (owner.type === "app") return { type: "app", message: `Reserved by Switchboard (${owner.label})` };
  return { type: "system", message: "Reserved by your browser or OS" };
}
