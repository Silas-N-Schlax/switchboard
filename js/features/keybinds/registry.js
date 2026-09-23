import { state } from "../../state.js";
import { save } from "../../storage.js";
import { defaultKeybinds } from "../../../defaults.js";

// The standard for registering a keybind anywhere in the app: call
// registerKeybind(id, {...}) with a stable id and a default key already
// present in defaultKeybinds (defaults.js). The actual key in effect always
// comes from settings.keybinds so it stays user-overridable; this registry
// only tracks handlers, not key assignment.
const registered = new Map();
let listenerAttached = false;

export function registerKeybind(id, { description, handler }) {
  registered.set(id, { description, handler });
}

export function unregisterKeybind(id) {
  registered.delete(id);
}

export function getKeybind(id) {
  return state.settings?.keybinds?.[id] ?? defaultKeybinds[id] ?? null;
}

export async function setKeybind(id, key) {
  state.settings.keybinds = { ...state.settings.keybinds, [id]: key };
  await save({ settings: state.settings });
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

function matchesKey(e, key) {
  return key != null && e.key === key && !e.ctrlKey && !e.metaKey && !e.altKey;
}

function onKeyDown(e) {
  if (isTypingTarget(e.target)) return;
  for (const [id, { handler }] of registered) {
    if (matchesKey(e, getKeybind(id))) {
      e.preventDefault();
      handler(e);
      return;
    }
  }
}

export function initKeybindListener() {
  if (listenerAttached) return;
  document.addEventListener("keydown", onKeyDown);
  listenerAttached = true;
}
