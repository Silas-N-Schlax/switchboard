import { state } from "../../state.js";
import { save } from "../../storage.js";
import { defaultKeybinds } from "../../../defaults.js";
import { serializeShortcutEvent, resolveShortcut } from "./shortcutFormat.js";

// The standard for registering a keybind anywhere in the app: call
// registerKeybind(id, {...}) with a stable id and a default key already
// present in defaultKeybinds (defaults.js). The actual key in effect always
// comes from settings.keybinds so it stays user-overridable; this registry
// only tracks handlers, not key assignment.
const registered = new Map();
let listenerAttached = false;

// `when` scopes a keybind (e.g. to a focused link); while it returns false the key is
// left alone, so a link shortcut on the same key still works.
export function registerKeybind(id, { description, handler, when = null }) {
  registered.set(id, { description, handler, when });
}

export function unregisterKeybind(id) {
  registered.delete(id);
}

// A stored null means the person cleared the key on purpose, so it must not fall back
// to the default the way a missing entry does.
export function getStoredKeybind(id) {
  const overrides = state.settings?.keybinds ?? {};
  return Object.hasOwn(overrides, id) ? overrides[id] : defaultKeybinds[id] ?? null;
}

export function getKeybind(id) {
  return resolveShortcut(getStoredKeybind(id));
}

export async function setKeybinds(changes) {
  state.settings.keybinds = { ...state.settings.keybinds, ...changes };
  await save({ settings: state.settings });
}

export function setKeybind(id, key) {
  return setKeybinds({ [id]: key });
}

export function listKeybinds() {
  return [...registered.entries()].map(([id, { description }]) => ({
    id,
    description,
    key: getKeybind(id),
  }));
}

function isTypingTarget(el) {
  return (
    el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable
  );
}

// Bare keys match on e.key (so "?"-style characters work across layouts); combos are
// stored in the canonical "Shift+L" form and matched the same way link shortcuts are.
// Layouts that type a bare-key character with AltGr (Windows/Linux, reported as
// Ctrl+Alt) or Option (macOS) still match it; e.key already proves that character
// was typed. Letters and digits never accept Alt, so Alt+L stays free.
export function matchesKeybind(e, id) {
  return matchesKey(e, getKeybind(id));
}

function matchesKey(e, key) {
  if (key == null) return false;
  if (key.length > 1 && key.includes("+")) return serializeShortcutEvent(e) === key;
  if (e.metaKey) return false;
  const isLetter = /^[a-z]$/i.test(key);
  // Letters ignore Caps Lock but not Shift, which belongs to "Shift+L"-style combos.
  if (isLetter ? e.shiftKey || e.key.toLowerCase() !== key.toLowerCase() : e.key !== key) return false;
  const altGr = e.getModifierState?.("AltGraph") ?? false;
  if (e.ctrlKey && !altGr) return false;
  return !e.altKey || altGr || !/^[a-z0-9]$/i.test(key);
}

function findActiveKeybind(e) {
  for (const [id, entry] of registered) {
    if (matchesKey(e, getKeybind(id)) && (!entry.when || entry.when())) return entry;
  }
  return null;
}

export function matchesAppKeybind(e) {
  return !isTypingTarget(e.target) && findActiveKeybind(e) !== null;
}

function onKeyDown(e) {
  if (isTypingTarget(e.target)) return;
  const entry = findActiveKeybind(e);
  if (!entry) return;
  e.preventDefault();
  entry.handler(e);
}

export function initKeybindListener() {
  if (listenerAttached) return;
  document.addEventListener("keydown", onKeyDown);
  listenerAttached = true;
}
