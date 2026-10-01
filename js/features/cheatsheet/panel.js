import { state } from "../../state.js";
import { listKeybinds, registerKeybind } from "../keybinds/registry.js";
import { buildShortcutBadges } from "../keybinds/shortcutBadges.js";
import { defaultKeybinds } from "../../../defaults.js";
import { buildDialogHeader, buildDialogGroup } from "../dialog/chrome.js";

function isCustomKeybind(id) {
  const override = state.settings?.keybinds?.[id];
  return override != null && override !== defaultKeybinds[id];
}

const GROUPS = [
  { title: "Navigate", ids: (id) => id.startsWith("tab-switch-") || id === "search-focus" },
  { title: "Launch groups", ids: (id) => id.startsWith("launch-group") },
];

function buildRow({ description, key, badges = null }) {
  const row = document.createElement("div");
  row.className = "cheatsheet-panel__row";

  const label = document.createElement("span");
  label.className = "cheatsheet-panel__description";
  label.textContent = description;

  const keys = badges ?? buildShortcutBadges(key);
  keys.classList.add("cheatsheet-panel__key");

  row.append(label, keys);
  return row;
}

function buildRange(first, last) {
  const badges = buildShortcutBadges(first);
  if (last && last !== first) {
    const dash = document.createElement("span");
    dash.className = "cheatsheet-panel__range";
    dash.textContent = "–";
    badges.append(dash, ...buildShortcutBadges(last).children);
  }
  return badges;
}

// The nine "switch to tab N" binds read as one row while they still sit on their
// default consecutive digits; a rebound one falls through to the Custom group.
function collapseTabSwitches(entries) {
  const tabs = entries.filter((e) => e.id.startsWith("tab-switch-"));
  if (tabs.length < 2) return entries;
  const collapsed = {
    id: "tab-switch",
    description: "Switch to tab",
    badges: buildRange(tabs[0].key, tabs.at(-1).key),
  };
  const firstIndex = entries.indexOf(tabs[0]);
  const rest = entries.filter((e) => !tabs.includes(e));
  rest.splice(firstIndex, 0, collapsed);
  return rest;
}

function buildSection(title, entries) {
  const { group } = buildDialogGroup({ label: title, rows: entries.map(buildRow) });
  return group;
}

function buildPanel() {
  const panel = document.createElement("div");
  panel.className = "cheatsheet-panel";

  const backdrop = document.createElement("div");
  backdrop.className = "cheatsheet-panel__backdrop overlay-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "cheatsheet-panel__dialog dialog surface surface--modal";

  const { header, close } = buildDialogHeader({
    title: "Keyboard shortcuts",
    closeLabel: "Close keyboard shortcuts",
  });

  const body = document.createElement("div");
  body.className = "dialog__body custom-scrollbar";

  dialog.append(header, body);
  panel.append(backdrop, dialog);

  function refresh() {
    body.innerHTML = "";
    const all = listKeybinds();
    const custom = all.filter((k) => isCustomKeybind(k.id));
    let remaining = all.filter((k) => !isCustomKeybind(k.id));

    GROUPS.forEach(({ title, ids }) => {
      const entries = remaining.filter((k) => ids(k.id));
      remaining = remaining.filter((k) => !ids(k.id));
      if (entries.length) body.appendChild(buildSection(title, collapseTabSwitches(entries)));
    });
    if (remaining.length) body.appendChild(buildSection("General", remaining));

    const links = state.links
      .filter((l) => l.shortcutKey)
      .map((l) => ({ id: l.id, description: l.label, key: l.shortcutKey }));
    if (links.length) body.appendChild(buildSection("Links", links));
    if (custom.length) body.appendChild(buildSection("Custom", custom));
  }

  function closePanel() {
    panel.classList.remove("cheatsheet-panel--open");
  }
  close.addEventListener("click", closePanel);
  backdrop.addEventListener("click", closePanel);

  return { panel, refresh, closePanel };
}

let instance = null;

document.addEventListener("keydown", () => {
  if (instance?.panel.classList.contains("cheatsheet-panel--open")) instance.closePanel();
});

function ensureInstance(root) {
  if (!instance) {
    instance = buildPanel();
    root.appendChild(instance.panel);
  }
  return instance;
}

export function openCheatsheet(root = document.body) {
  const { refresh, panel } = ensureInstance(root);
  refresh();
  panel.classList.add("cheatsheet-panel--open");
}

export function initCheatsheetToggle(root = document.body) {
  ensureInstance(root);

  registerKeybind("cheatsheet-open", {
    description: "Show keyboard shortcuts",
    handler: () => openCheatsheet(root),
  });

  if (document.querySelector(".cheatsheet-toggle")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "settings-toggle cheatsheet-toggle";
  button.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8"/></svg>`;
  button.setAttribute("aria-label", "Open keyboard shortcuts");
  button.addEventListener("click", () => openCheatsheet(root));
  root.appendChild(button);
}
