import { state } from "../../state.js";
import { save } from "../../storage.js";
import { defaultKeybinds } from "../../../defaults.js";
import { getKeybind, getStoredKeybind, setKeybinds } from "./registry.js";
import { keybindSections, tabSwitchSlot } from "./catalog.js";
import { keybindFromEvent, describeShortcut, comparableShortcut } from "./shortcutFormat.js";
import { buildShortcutBadges } from "./shortcutBadges.js";
import { findKeyOwner } from "./shortcutValidation.js";
import { buildDialogHeader, buildDialogGroup } from "../dialog/chrome.js";
import { confirmDialog } from "../dialog/confirm.js";
import { sortedTabs } from "../tabLinks/store.js";

let rootEl = null;
let bodyEl = null;
let rows = new Map();
let capturingId = null;
let returnFocusEl = null;
let onChangeRef = () => {};

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isDefault(id) {
  return getStoredKeybind(id) === (defaultKeybinds[id] ?? null);
}

function setError(id, message) {
  const row = rows.get(id);
  if (row) row.error.textContent = message ?? "";
}

function renderKey(id) {
  const row = rows.get(id);
  if (!row) return;
  const key = getKeybind(id);
  const capturing = capturingId === id;
  row.button.classList.toggle("keybind-editor__key--capturing", capturing);
  row.button.classList.toggle("keybind-editor__key--empty", !key && !capturing);
  if (capturing) {
    row.button.textContent = "Press keys…";
  } else if (key) {
    row.button.replaceChildren(buildShortcutBadges(key));
  } else {
    row.button.textContent = "None";
  }
  row.button.setAttribute("aria-label", `${row.label}: ${key ? describeShortcut(key) : "no shortcut"}. Press to change.`);
  row.reset.hidden = isDefault(id);
}

function renderAllKeys() {
  rows.forEach((_, id) => renderKey(id));
}

function stopCapturing() {
  const id = capturingId;
  capturingId = null;
  if (id) renderKey(id);
}

function startCapturing(id) {
  const previous = capturingId;
  capturingId = id;
  if (previous && previous !== id) renderKey(previous);
  setError(id, null);
  renderKey(id);
}

async function commit(changes) {
  await setKeybinds(changes);
  renderAllKeys();
  onChangeRef();
}

// Every path that gives an action a key goes through here, so a clash always asks
// before taking the key from its owner.
async function assignKey(id, key) {
  stopCapturing();
  if (key === getKeybind(id) || (key === null && getKeybind(id) === null)) return;
  if (key === null) return commit({ [id]: null });

  const owner = findKeyOwner(key, { excludeActionId: id });
  if (owner?.type === "system") {
    setError(id, `${describeShortcut(key)} is reserved by your browser or OS`);
    return;
  }
  if (owner) {
    const replace = await confirmDialog({
      title: `${describeShortcut(key)} is already in use`,
      message: `It's the shortcut for ${owner.label}. Replace it? ${capitalize(owner.label)} will have no shortcut.`,
      confirmLabel: "Replace",
    });
    rows.get(id)?.button.focus();
    if (!replace) return;
    if (owner.type === "link") {
      owner.link.shortcutKey = null;
      await save({ links: state.links });
      return commit({ [id]: key });
    }
    return commit({ [owner.id]: null, [id]: key });
  }
  return commit({ [id]: key });
}

// Links holding a key that some action gets back on Reset all, so the reset can take it
// from them instead of leaving two owners on one key.
function linksClashingWithDefaults() {
  const defaults = new Set(Object.values(defaultKeybinds).map(comparableShortcut).filter(Boolean));
  return state.links.filter((l) => l.shortcutKey && defaults.has(comparableShortcut(l.shortcutKey)));
}

function focusableIn(el) {
  return [...el.querySelectorAll("button:not(:disabled):not([hidden])")];
}

function trapTab(e) {
  const focusable = focusableIn(rootEl.querySelector(".keybind-editor__dialog"));
  const index = focusable.indexOf(document.activeElement);
  const next = (index + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
  e.preventDefault();
  focusable[next].focus();
}

function onKeyDown(e) {
  // Contain every key so app keybinds and link shortcuts can't fire behind the editor.
  e.stopPropagation();
  if (!capturingId) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeKeybindEditor();
    } else if (e.key === "Tab") {
      trapTab(e);
    }
    return;
  }
  e.preventDefault();
  const plain = !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
  if (plain && e.key === "Escape") return stopCapturing();
  if (plain && (e.key === "Backspace" || e.key === "Delete")) return assignKey(capturingId, null);
  const key = keybindFromEvent(e);
  if (key) return assignKey(capturingId, key);
  if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
    setError(capturingId, `${e.key === " " ? "Space" : e.key} can't be a shortcut on its own`);
  }
}

function tabName(id) {
  const slot = tabSwitchSlot(id);
  return slot ? sortedTabs()[slot - 1]?.name ?? null : null;
}

function buildRow({ id, label }) {
  const row = document.createElement("div");
  row.className = "keybind-editor__row";

  const text = document.createElement("div");
  text.className = "keybind-editor__text";
  const name = document.createElement("span");
  name.className = "keybind-editor__label";
  name.textContent = label;
  const tab = tabName(id);
  if (tab) {
    const detail = document.createElement("span");
    detail.className = "keybind-editor__detail";
    detail.textContent = tab;
    name.append(" ", detail);
  }
  const error = document.createElement("span");
  error.className = "keybind-editor__error";
  error.setAttribute("role", "status");
  text.append(name, error);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "keybind-editor__key";
  button.addEventListener("click", () => (capturingId === id ? stopCapturing() : startCapturing(id)));
  button.addEventListener("blur", () => {
    if (capturingId === id) stopCapturing();
  });

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "keybind-editor__reset";
  reset.textContent = "↺";
  reset.title = "Reset to default";
  reset.setAttribute("aria-label", `Reset ${label} to default`);
  reset.addEventListener("click", () => assignKey(id, defaultKeybinds[id] ?? null));

  row.append(text, button, reset);
  rows.set(id, { label, button, reset, error });
  return row;
}

function renderBody() {
  rows = new Map();
  bodyEl.replaceChildren(
    ...keybindSections.map(({ title, actions }) => buildDialogGroup({ label: title, rows: actions.map(buildRow) }).group)
  );
  renderAllKeys();
}

function build() {
  const root = document.createElement("div");
  root.className = "keybind-editor";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Customize shortcuts");

  const backdrop = document.createElement("div");
  backdrop.className = "overlay-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "keybind-editor__dialog dialog surface";
  dialog.tabIndex = -1;

  const { header, close } = buildDialogHeader({ title: "Customize shortcuts", closeLabel: "Close shortcut editor" });

  bodyEl = document.createElement("div");
  bodyEl.className = "dialog__body custom-scrollbar";

  const footer = document.createElement("div");
  footer.className = "dialog__footer keybind-editor__footer";
  const note = document.createElement("span");
  note.className = "keybind-editor__note";
  note.textContent = "Click a shortcut, then press the new keys. Backspace clears it.";
  const resetAll = document.createElement("button");
  resetAll.type = "button";
  resetAll.className = "keybind-editor__reset-all";
  resetAll.textContent = "Reset all";
  resetAll.addEventListener("click", async () => {
    stopCapturing();
    const clashing = linksClashingWithDefaults();
    const linkNote = clashing.length
      ? ` ${clashing.length === 1 ? `The link "${clashing[0].label}" loses its shortcut` : `${clashing.length} links lose their shortcuts`}, since an action takes that key back.`
      : "";
    const confirmed = await confirmDialog({
      title: "Reset every shortcut?",
      message: `Every action goes back to its default key, and ones you added keys to go back to none.${linkNote}`,
      confirmLabel: "Reset all",
      danger: true,
    });
    if (!confirmed) return;
    if (clashing.length) {
      clashing.forEach((link) => (link.shortcutKey = null));
      await save({ links: state.links });
    }
    await commit({ ...defaultKeybinds });
  });
  footer.append(note, resetAll);

  dialog.append(header, bodyEl, footer);
  root.append(backdrop, dialog);

  close.addEventListener("click", closeKeybindEditor);
  backdrop.addEventListener("click", closeKeybindEditor);
  root.addEventListener("keydown", onKeyDown);
  return root;
}

export function closeKeybindEditor() {
  if (!rootEl?.classList.contains("keybind-editor--open")) return;
  stopCapturing();
  rootEl.classList.remove("keybind-editor--open");
  if (returnFocusEl?.isConnected) returnFocusEl.focus();
  returnFocusEl = null;
}

export function openKeybindEditor(onChange = () => {}) {
  onChangeRef = onChange;
  if (!rootEl) {
    rootEl = build();
    document.body.appendChild(rootEl);
  }
  returnFocusEl = document.activeElement;
  capturingId = null;
  renderBody();
  rootEl.classList.add("keybind-editor--open");
  rootEl.querySelector(".keybind-editor__dialog").focus();
}
