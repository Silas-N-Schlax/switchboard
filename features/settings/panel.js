import { state } from "../../core/state.js";
import { save } from "../../core/storage.js";
import { renderAmbient } from "../ambient/ambient.js";
import { defaultAmbientSettings, feedbackUrl, interfaceFont, monoFont } from "../../defaults.js";
import { applyDisplaySettings } from "./store.js";
import { buildGeneralSection } from "./general-section.js";
import { buildLayoutSection } from "../layout/section.js";
import { buildColorSection } from "./color-section.js";
import { buildBackgroundSection } from "./background-section.js";
import { buildStatsSection } from "./stats-section.js";
import { buildLinksSection } from "./links-section.js";
import { buildDataSection } from "./data-section.js";
import { buildKeybindsSection } from "./keybinds-section.js";
import { dismissSwatchPopover } from "./swatch-picker.js";
import { registerKeybind, matchesKeybind } from "../../shared/keybinds/registry.js";
import { buildDialogHeader } from "../../shared/dialog/chrome.js";
import { hasBackgrounds, loadBackgrounds } from "../backgrounds/index.js";
import { featureFolders, loadFeature } from "../../core/features.js";

let panelEl = null;
let returnFocusEl = null;
let onSettingsChange = () => {};
let sections = [];
let panelReady = null;

const releaseNotesFolder = "features/releaseNotes";

// Release notes load only when asked for, so they cost a normal new tab nothing.
function buildReleaseNotesButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "settings-panel__release-notes";
  button.textContent = "Release notes";
  button.addEventListener("click", async () => {
    const { openReleaseNotes } = await loadFeature(releaseNotesFolder);
    openReleaseNotes();
  });
  return button;
}

function buildPanel(backgrounds) {
  const panel = document.createElement("div");
  panel.className = "settings-panel";

  const backdrop = document.createElement("div");
  backdrop.className = "settings-panel__backdrop overlay-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "settings-panel__dialog dialog surface surface--modal";
  dialog.tabIndex = -1;

  const { header, close } = buildDialogHeader({ title: "Settings", closeLabel: "Close settings" });

  const generalSection = buildGeneralSection(() => onSettingsChange());
  const layoutSection = buildLayoutSection(() => onSettingsChange());
  const keybindsSection = buildKeybindsSection(() => onSettingsChange());
  const colorSection = buildColorSection();
  // Without any backgrounds (lite) there's nothing to pick, so the section is left out.
  const backgroundSection = hasBackgrounds ? buildBackgroundSection(backgrounds) : null;
  const linksSection = buildLinksSection(() => onSettingsChange());
  const statsSection = buildStatsSection();
  const dataSection = buildDataSection(() => onSettingsChange());

  const footer = document.createElement("div");
  footer.className = "dialog__footer";
  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "settings-panel__reset";
  resetButton.textContent = "Reset appearance";
  resetButton.addEventListener("click", async () => {
    Object.assign(state.settings, { ambientMode: { ...defaultAmbientSettings }, interfaceFont, monoFont });
    await save({ settings: state.settings });
    renderAmbient(document.body, state.settings);
    applyDisplaySettings();
    generalSection.refresh();
    colorSection.refresh();
    backgroundSection?.refresh();
  });
  const feedbackLink = document.createElement("a");
  feedbackLink.className = "settings-panel__feedback";
  feedbackLink.href = feedbackUrl;
  feedbackLink.target = "_blank";
  feedbackLink.rel = "noopener";
  feedbackLink.textContent = "Send feedback ↗";
  footer.append(resetButton);
  if (featureFolders.includes(releaseNotesFolder)) footer.append(buildReleaseNotesButton());
  footer.append(feedbackLink);

  sections = [
    generalSection,
    layoutSection,
    keybindsSection,
    colorSection,
    backgroundSection,
    linksSection,
    statsSection,
    dataSection,
  ].filter(Boolean);

  const body = document.createElement("div");
  body.className = "dialog__body custom-scrollbar";
  body.append(...sections.map((section) => section.element));

  dialog.append(header, body, footer);
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

// The background picker needs every background's controls, so they load the first time the
// panel opens rather than on every new tab.
export async function openSettings(root = document.body) {
  panelReady ??= loadBackgrounds().then((backgrounds) => {
    panelEl = buildPanel(backgrounds);
    root.appendChild(panelEl);
  });
  await panelReady;
  if (isOpen()) return;
  returnFocusEl = document.activeElement;
  sections.forEach((section) => section.refresh?.());
  panelEl.classList.add("settings-panel--open");
  panelEl.querySelector(".settings-panel__dialog").focus();
}

export function initSettingsToggle(root = document.body, onChange = () => {}) {
  onSettingsChange = onChange;
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
