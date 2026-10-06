import { state } from "../../state.js";
import { save } from "../../storage.js";
import { renderAmbient } from "../../render/ambient.js";

export function ambientMode() {
  return state.settings.ambientMode;
}

export function applyDisplaySettings(root = document.body) {
  root.classList.toggle("hide-keycap-hints", !state.settings.showKeycapHints);
}

export async function updateSettings(partial) {
  Object.assign(state.settings, partial);
  await save({ settings: state.settings });
}

export async function updateAmbient(partial) {
  Object.assign(ambientMode(), partial);
  await save({ settings: state.settings });
  renderAmbient(document.body, state.settings);
}
