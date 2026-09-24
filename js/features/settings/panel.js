import { state } from "../../state.js";
import { save } from "../../storage.js";
import { renderAmbient } from "../../render/ambient.js";
import { defaultAmbientSettings } from "../../../defaults.js";
import { buildColorSection } from "./color-section.js";
import { buildBubblesSection } from "./bubbles-section.js";

function buildPanel() {
  const panel = document.createElement("div");
  panel.className = "settings-panel";

  const backdrop = document.createElement("div");
  backdrop.className = "settings-panel__backdrop overlay-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "settings-panel__dialog surface surface--modal custom-scrollbar";

  const header = document.createElement("div");
  header.className = "settings-panel__header";
  const title = document.createElement("h2");
  title.className = "settings-panel__title";
  title.textContent = "Appearance";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "settings-panel__close dialog-close";
  close.textContent = "×";
  close.setAttribute("aria-label", "Close settings");
  header.append(title, close);

  const colorSection = buildColorSection();
  const bubblesSection = buildBubblesSection();

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

  dialog.append(header, colorSection.element, bubblesSection.element, footer);
  panel.append(backdrop, dialog);

  function closePanel() {
    panel.classList.remove("settings-panel--open");
  }
  close.addEventListener("click", closePanel);
  backdrop.addEventListener("click", closePanel);

  return panel;
}

export function openSettings(root = document.body) {
  let panel = document.querySelector(".settings-panel");
  if (!panel) {
    panel = buildPanel();
    root.appendChild(panel);
  }
  panel.classList.add("settings-panel--open");
}

export function initSettingsToggle(root = document.body) {
  if (document.querySelector(".settings-toggle")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "settings-toggle";
  button.textContent = "⚙";
  button.setAttribute("aria-label", "Open appearance settings");
  button.addEventListener("click", () => openSettings(root));
  root.appendChild(button);
}
