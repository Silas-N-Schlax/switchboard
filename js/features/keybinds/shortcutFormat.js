import { isMac, platform } from "./platform.js";

const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta"]);

export function isModifierOnlyKey(key) {
  return MODIFIER_KEYS.has(key);
}

// e.key reflects the *character produced* — on macOS, Option+A produces "å"/"Å", not
// "A". e.code is the physical key, unaffected by Option/Alt-as-dead-key behavior or
// Shift-produced symbols, so it's what we map to a clean display label instead.
const NAMED_CODES = {
  Slash: "/",
  Backslash: "\\",
  Period: ".",
  Comma: ",",
  Semicolon: ";",
  Quote: "'",
  BracketLeft: "[",
  BracketRight: "]",
  Minus: "-",
  Equal: "=",
  Backquote: "`",
  Space: "Space",
  Enter: "Enter",
  Tab: "Tab",
  Escape: "Esc",
  Backspace: "Backspace",
  Delete: "Delete",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Home: "Home",
  End: "End",
  PageUp: "PgUp",
  PageDown: "PgDn",
};

export function keyLabelFromCode(code) {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return NAMED_CODES[code] ?? code;
}

export function serializeShortcut({ ctrlKey = false, metaKey = false, altKey = false, shiftKey = false, keyLabel }) {
  const parts = [];
  if (ctrlKey) parts.push("Ctrl");
  if (metaKey) parts.push("Meta");
  if (altKey) parts.push("Alt");
  if (shiftKey) parts.push("Shift");
  parts.push(keyLabel);
  return parts.join("+");
}

export function serializeShortcutEvent(e) {
  return serializeShortcut({
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    altKey: e.altKey,
    shiftKey: e.shiftKey,
    keyLabel: keyLabelFromCode(e.code),
  });
}

// "Mod" in a stored shortcut is the platform's primary modifier: Cmd on macOS, Ctrl
// everywhere else, where Meta is the Windows/Super key the OS keeps for itself.
const PRIMARY_MODIFIER = isMac ? "Meta" : "Ctrl";

export function resolveShortcut(canonical) {
  if (!canonical || !canonical.includes("+")) return canonical;
  const parts = canonical.split("+");
  if (!parts.includes("Mod")) return canonical;
  const keyLabel = parts.pop();
  const has = (modifier) => parts.includes(modifier) || (modifier === PRIMARY_MODIFIER && parts.includes("Mod"));
  return serializeShortcut({
    ctrlKey: has("Ctrl"),
    metaKey: has("Meta"),
    altKey: has("Alt"),
    shiftKey: has("Shift"),
    keyLabel,
  });
}

const DISPLAY_ORDER = isMac ? ["Ctrl", "Alt", "Shift", "Meta"] : ["Meta", "Ctrl", "Alt", "Shift"];
const META_LABELS = { windows: "Win", chromeos: "Search", linux: "Super" };
const MODIFIER_LABELS = isMac
  ? { Ctrl: "Control", Meta: "Command", Alt: "Option", Shift: "Shift" }
  : { Ctrl: "Ctrl", Meta: META_LABELS[platform], Alt: "Alt", Shift: "Shift" };

// Breaks a canonical shortcut into one part per keycap, modifiers first in the
// platform's conventional order. `modifier` is set on modifier parts so macOS can draw
// them as icons; `label` is the text shown (or the icon's accessible name).
export function formatShortcutParts(canonical) {
  const resolved = resolveShortcut(canonical);
  if (!resolved) return [];
  const parts = resolved.length > 1 && resolved.includes("+") ? resolved.split("+") : [resolved];
  const key = parts.pop();
  const modifiers = DISPLAY_ORDER.filter((m) => parts.includes(m)).map((m) => ({ modifier: m, label: MODIFIER_LABELS[m] }));
  return [...modifiers, { modifier: null, label: key.length === 1 ? key.toUpperCase() : key }];
}
