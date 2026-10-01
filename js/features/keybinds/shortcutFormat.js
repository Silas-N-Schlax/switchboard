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

// The canonical "Ctrl+Alt+C" string is only ever used for storage/matching — this
// breaks it into the individual symbols ("⌃", "⌥", "C") each shown as its own keycap
// wherever a shortcut is displayed to the user, rather than crammed into one badge.
const DISPLAY_SYMBOLS = { Ctrl: "⌃", Meta: "⌘", Alt: "⌥", Shift: "⇧" };

export function formatShortcutParts(canonical) {
  if (!canonical) return [];
  return canonical
    .split("+")
    .map((part) => DISPLAY_SYMBOLS[part] ?? (part.length === 1 ? part.toUpperCase() : part));
}
