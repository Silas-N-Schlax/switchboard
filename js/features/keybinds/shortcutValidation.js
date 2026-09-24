import { state } from "../../state.js";
import { listKeybinds } from "./registry.js";
import { serializeShortcut } from "./shortcutFormat.js";
import { reservedSystemShortcuts } from "../../../defaults.js";

// Hard-blocks a link shortcut candidate against: another link already using it,
// one of Switchboard's own registered shortcuts, or a curated (best-effort, never
// exhaustive) list of common browser/OS shortcuts. Returns null when the candidate
// is free to use.
export function findShortcutConflict(candidate, { excludeLinkId = null } = {}) {
  if (!candidate) return null;

  const link = state.links.find((l) => l.id !== excludeLinkId && l.shortcutKey === candidate);
  if (link) return { type: "link", message: `Already used by "${link.label}"` };

  const appBind = listKeybinds().find(
    (k) => serializeShortcut({ keyLabel: k.key?.length === 1 ? k.key.toUpperCase() : k.key }) === candidate
  );
  if (appBind) return { type: "app", message: `Reserved by Switchboard (${appBind.description})` };

  if (reservedSystemShortcuts.includes(candidate)) {
    return { type: "system", message: "Reserved by your browser or OS" };
  }

  return null;
}
