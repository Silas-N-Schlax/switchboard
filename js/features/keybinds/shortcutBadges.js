import { formatShortcutParts } from "./shortcutFormat.js";

// Renders one .keybind-badge keycap per symbol/key in the shortcut, instead of
// cramming every symbol into a single badge — matches the OS convention of showing
// each modifier as its own little key.
export function buildShortcutBadges(canonical) {
  const group = document.createElement("span");
  group.className = "shortcut-badges";
  formatShortcutParts(canonical).forEach((part) => {
    const badge = document.createElement("span");
    badge.className = "keybind-badge shortcut-badges__key";
    badge.textContent = part;
    group.appendChild(badge);
  });
  return group;
}
