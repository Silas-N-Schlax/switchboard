import { state } from "../../state.js";
import { listKeybinds, registerKeybind } from "../keybinds/registry.js";
import { defaultKeybinds } from "../../../defaults.js";

function isCustomKeybind(id) {
  const override = state.settings?.keybinds?.[id];
  return override != null && override !== defaultKeybinds[id];
}

function buildRow({ id, description, key }) {
  const row = document.createElement("div");
  row.className = "cheatsheet-panel__row";

  const label = document.createElement("span");
  label.className = "cheatsheet-panel__description";
  label.textContent = description ?? id;

  const badge = document.createElement("span");
  badge.className = "keybind-badge cheatsheet-panel__key";
  badge.textContent = key ?? "";

  row.append(label, badge);
  return row;
}

function buildSection(title, entries) {
  const section = document.createElement("div");
  section.className = "cheatsheet-panel__section";

  const heading = document.createElement("h3");
  heading.className = "cheatsheet-panel__heading";
  heading.textContent = title;

  section.appendChild(heading);
  entries.forEach((entry) => section.appendChild(buildRow(entry)));
  return section;
}

function buildPanel() {
  const panel = document.createElement("div");
  panel.className = "cheatsheet-panel";

  const backdrop = document.createElement("div");
  backdrop.className = "cheatsheet-panel__backdrop overlay-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "cheatsheet-panel__dialog surface surface--modal custom-scrollbar";

  const header = document.createElement("div");
  header.className = "cheatsheet-panel__header";
  const title = document.createElement("h2");
  title.className = "cheatsheet-panel__title";
  title.textContent = "Keyboard Shortcuts";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "cheatsheet-panel__close dialog-close";
  close.textContent = "×";
  close.setAttribute("aria-label", "Close keyboard shortcuts");
  header.append(title, close);

  const body = document.createElement("div");
  body.className = "cheatsheet-panel__body";

  dialog.append(header, body);
  panel.append(backdrop, dialog);

  function refresh() {
    body.innerHTML = "";
    const all = listKeybinds();
    const custom = all.filter((k) => isCustomKeybind(k.id));
    const standard = all.filter((k) => !isCustomKeybind(k.id));

    if (standard.length) body.appendChild(buildSection("Shortcuts", standard));
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
  button.textContent = "⌨";
  button.setAttribute("aria-label", "Open keyboard shortcuts");
  button.addEventListener("click", () => openCheatsheet(root));
  root.appendChild(button);
}
