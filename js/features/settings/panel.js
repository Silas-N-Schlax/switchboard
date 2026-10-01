import { state } from "../../state.js";
import { save } from "../../storage.js";
import { renderAmbient } from "../../render/ambient.js";
import { defaultAmbientSettings } from "../../../defaults.js";
import { buildColorSection } from "./color-section.js";
import { buildBubblesSection } from "./bubbles-section.js";
import { buildStatsSection } from "./stats-section.js";
import { dismissSwatchPopover } from "./swatch-picker.js";
import { registerKeybind, matchesKeybind } from "../keybinds/registry.js";

let panelEl = null;
let returnFocusEl = null;

function buildPanel() {
  const panel = document.createElement("div");
  panel.className = "settings-panel";

  const backdrop = document.createElement("div");
  backdrop.className = "settings-panel__backdrop overlay-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "settings-panel__dialog surface surface--modal custom-scrollbar";
  dialog.tabIndex = -1;

  const header = document.createElement("div");
  header.className = "settings-panel__header";
  const title = document.createElement("h2");
  title.className = "settings-panel__title";
  title.textContent = "Settings";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "settings-panel__close dialog-close";
  close.textContent = "×";
  close.setAttribute("aria-label", "Close settings");
  header.append(title, close);

  const colorSection = buildColorSection();
  const bubblesSection = buildBubblesSection();
  const statsSection = buildStatsSection();

  const footer = document.createElement("div");
  footer.className = "settings-panel__footer";
  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "settings-panel__reset";
  resetButton.textContent = "Reset to defaults";
  resetButton.addEventListener("click", async () => {
    state.settings.ambientMode = { ...defaultAmbientSettings };
    await save({ settings: state.settings });
    renderAmbient(document.body, state.settings);
    colorSection.refresh();
    bubblesSection.refresh();
  });
  footer.appendChild(resetButton);

  dialog.append(header, colorSection.element, bubblesSection.element, statsSection.element, footer);
  panel.append(backdrop, dialog);

  close.addEventListener("click", closeSettings);
  backdrop.addEventListener("click", closeSettings);
  panel.addEventListener("keydown", onPanelKeyDown);

  return panel;
}

function onPanelKeyDown(e) {
  // Contain every key so app keybinds and link shortcuts can't fire behind the modal.
  e.stopPropagation();
  if (e.key === "Escape") {
    e.preventDefault();
    if (!dismissSwatchPopover()) closeSettings();
  } else if (matchesKeybind(e, "settings-open") && e.target.tagName !== "INPUT") {
    e.preventDefault();
    closeSettings();
  }
}

function isOpen() {
  return panelEl?.classList.contains("settings-panel--open") ?? false;
}

export function closeSettings() {
  if (!isOpen()) return;
  dismissSwatchPopover();
  panelEl.classList.remove("settings-panel--open");
  if (panelEl.contains(document.activeElement)) document.activeElement.blur();
  if (returnFocusEl?.isConnected) returnFocusEl.focus();
  returnFocusEl = null;
}

export function openSettings(root = document.body) {
  if (!panelEl) {
    panelEl = buildPanel();
    root.appendChild(panelEl);
  }
  if (isOpen()) return;
  returnFocusEl = document.activeElement;
  panelEl.classList.add("settings-panel--open");
  panelEl.querySelector(".settings-panel__dialog").focus();
}

export function initSettingsToggle(root = document.body) {
  registerKeybind("settings-open", {
    description: "Open settings",
    handler: () => openSettings(root),
  });

  if (document.querySelector(".settings-toggle")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "settings-toggle";
  button.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
  button.setAttribute("aria-label", "Open settings");
  button.addEventListener("click", () => openSettings(root));
  root.appendChild(button);
}
