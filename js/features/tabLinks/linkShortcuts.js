import { state } from "../../state.js";
import { serializeShortcutEvent } from "../keybinds/shortcutFormat.js";

function isTypingTarget(el) {
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

let attached = false;

// Deliberately bypasses the registry.js Map (bare-key, fixed-id app shortcuts) —
// link shortcuts are a dynamic, potentially large, modifier-aware keyspace, and
// matching straight against state.links here means the shortcut works regardless
// of which tab is active, with no per-link register/unregister bookkeeping needed.
export function initLinkShortcutListener() {
  if (attached) return;
  attached = true;
  document.addEventListener("keydown", (e) => {
    if (isTypingTarget(e.target)) return;
    const candidate = serializeShortcutEvent(e);
    const link = state.links.find((l) => l.shortcutKey === candidate);
    if (!link) return;
    e.preventDefault();
    window.location.href = link.url;
  });
}
