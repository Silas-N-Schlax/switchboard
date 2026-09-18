import { load, isInitialized, seedFromDefaults } from "./storage.js";
import { setState } from "./state.js";

async function init() {
  const initialized = await isInitialized();
  const data = initialized ? await load() : await seedFromDefaults();
  setState(data);
  console.log("[switchboard] initialized:", initialized, data);
  render();
}

function render() {
  // TODO: render tab dock, link grid, search bar, ambient background
}

init();
