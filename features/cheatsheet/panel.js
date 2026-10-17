import { state } from "../../core/state.js";
import { listKeybinds, registerKeybind, getKeybind } from "../../shared/keybinds/registry.js";
import { keybindSections, tabSwitchSlot } from "../../shared/keybinds/catalog.js";
import { sortedTabs } from "../tabLinks/store.js";
import { buildShortcutBadges } from "../../shared/keybinds/shortcutBadges.js";
import { buildDialogHeader, buildDialogGroup } from "../../shared/dialog/chrome.js";

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

function buildTabRuns(slots) {
  const runs = [];
  slots.forEach((slot) => {
    const last = runs.at(-1);
    if (last && slot === last.to + 1) last.to = slot;
    else runs.push({ from: slot, to: slot });
  });

  const badges = document.createElement("span");
  badges.className = "shortcut-badges";
  const separator = (text) => {
    const el = document.createElement("span");
    el.className = "cheatsheet-panel__range";
    el.textContent = text;
    return el;
  };
  runs.forEach(({ from, to }, i) => {
    if (i > 0) badges.append(separator(","));
    badges.append(...buildShortcutBadges(String(from)).children);
    if (to > from) badges.append(separator("–"), ...buildShortcutBadges(String(to)).children);
  });
  return badges;
}

// Tab slots still on their own digit read as one row of runs ("1–3, 5"); a slot bound
// to anything else keeps its own row so its key isn't mistaken for a position.
function collapseTabSwitches(entries) {
  const onDigit = entries.filter((e) => {
    const slot = tabSwitchSlot(e.id);
    return slot && e.key === String(slot);
  });
  if (onDigit.length < 2) return entries;
  const collapsed = {
    id: "tab-switch",
    description: "Switch to tab",
    badges: buildTabRuns(onDigit.map((e) => tabSwitchSlot(e.id))),
  };
  const firstIndex = entries.indexOf(onDigit[0]);
  const rest = entries.filter((e) => !onDigit.includes(e));
  rest.splice(firstIndex, 0, collapsed);
  return rest;
}

function describe({ id, label }) {
  const slot = tabSwitchSlot(id);
  const tab = slot ? sortedTabs()[slot - 1] : null;
  return tab ? `${label} (${tab.name})` : label;
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
    const registered = new Set(listKeybinds().map((k) => k.id));
    keybindSections.forEach(({ title, actions }) => {
      const entries = actions
        .filter((a) => registered.has(a.id) && getKeybind(a.id))
        .map((a) => ({ id: a.id, description: describe(a), key: getKeybind(a.id) }));
      if (entries.length) body.appendChild(buildSection(title, collapseTabSwitches(entries)));
    });

    const links = state.links
      .filter((l) => l.shortcutKey)
      .map((l) => ({ id: l.id, description: l.label, key: l.shortcutKey }));
    if (links.length) body.appendChild(buildSection("Your links", links));
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
