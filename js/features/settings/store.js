import { state } from "../../state.js";
import { save } from "../../storage.js";
import { renderAmbient } from "../../render/ambient.js";

export function ambientMode() {
  return state.settings.ambientMode;
}

export async function updateAmbient(partial) {
  Object.assign(ambientMode(), partial);
  await save({ settings: state.settings });
  renderAmbient(document.body, state.settings);
}
