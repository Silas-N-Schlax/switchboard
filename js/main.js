import { load, isInitialized, seedFromDefaults } from "./storage.js";
import { setState, state } from "./state.js";
import { renderAmbient } from "./render/ambient.js";
import { initSettingsToggle } from "./features/settings/index.js";

async function init() {
  const initialized = await isInitialized();
  const data = initialized ? await load() : await seedFromDefaults();
  setState(data);
  console.log("[switchboard] initialized:", initialized, data);
  render();
}

function render() {
  renderAmbient(document.body, state.settings);
  initSettingsToggle(document.body);
  // TODO: render tab dock, link grid, search bar
}

init();
