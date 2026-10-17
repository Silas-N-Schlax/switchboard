import { state } from "../../core/state.js";
import { save } from "../../core/storage.js";
import { renderAmbient } from "../ambient/ambient.js";
import { interfaceFontOptions, monoFontOptions } from "../../defaults.js";
import { applyLayout } from "../layout/layout.js";

export function ambientMode() {
  return state.settings.ambientMode;
}

function fontStack(options, id) {
  return (options.find((option) => option.id === id) ?? options[0]).stack;
}

export function applyDisplaySettings(root = document.body) {
  root.classList.toggle("hide-keycap-hints", !state.settings.showKeycapHints);
  applyLayout(root);
  const { style } = document.documentElement;
  style.setProperty("--font-ui", fontStack(interfaceFontOptions, state.settings.interfaceFont));
  style.setProperty("--font-mono", fontStack(monoFontOptions, state.settings.monoFont));
}

export async function updateSettings(partial) {
  Object.assign(state.settings, partial);
  await save({ settings: state.settings });
}

export function backgroundStyle(id) {
  const styles = ambientMode().backgroundStyles;
  styles[id] ??= {};
  return styles[id];
}

export async function updateBackgroundStyle(id, partial) {
  Object.assign(backgroundStyle(id), partial);
  await save({ settings: state.settings });
  renderAmbient(document.body, state.settings);
}

export async function updateAmbient(partial) {
  Object.assign(ambientMode(), partial);
  await save({ settings: state.settings });
  renderAmbient(document.body, state.settings);
}
