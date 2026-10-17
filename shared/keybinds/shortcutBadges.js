import { formatShortcutParts } from "./shortcutFormat.js";
import { isMac } from "./platform.js";

const SVG_NS = "http://www.w3.org/2000/svg";

// IBM Plex Mono has no ⌘ ⌥ ⇧ ⌃ glyphs, so the browser fell back to a system font that
// drew them at half size. Drawn as paths they match the keycap's ink and weight.
const MODIFIER_ICON_PATHS = {
  Meta: "M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3Z",
  Alt: "M3 6h5l8 12h5M14 6h7",
  Shift: "M12 4 4 12h4.5v7h7v-7H20Z",
  Ctrl: "m6 14 6-6 6 6",
};

function buildModifierIcon(modifier) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("keybind-badge__icon");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", MODIFIER_ICON_PATHS[modifier]);
  svg.appendChild(path);
  return svg;
}

export function buildKeyBadge({ modifier, label }) {
  const badge = document.createElement("span");
  badge.className = "keybind-badge shortcut-badges__key";
  if (isMac && modifier) {
    badge.setAttribute("aria-label", label);
    badge.title = label;
    badge.appendChild(buildModifierIcon(modifier));
  } else {
    badge.textContent = label;
  }
  return badge;
}

// One .keybind-badge keycap per key in the shortcut, matching the OS convention of
// showing each modifier as its own little key.
export function buildShortcutBadges(canonical) {
  const group = document.createElement("span");
  group.className = "shortcut-badges";
  formatShortcutParts(canonical).forEach((part) => group.appendChild(buildKeyBadge(part)));
  return group;
}
