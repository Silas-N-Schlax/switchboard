// Backgrounds are read from features.json and loaded on demand, so a new tab only fetches the
// one it shows, and a build that leaves them out of the list (lite) simply has none. Each one's
// folder is named after its id, and its entry module exports the background under that id.
import { featureFolders, loadFeature } from "../../core/features.js";

const none = { id: "none", label: "None", controls: [] };
const folders = featureFolders.filter((folder) => folder.startsWith("features/backgrounds/"));
const loading = new Map();

export const hasBackgrounds = folders.length > 0;

export function loadBackground(id) {
  const folder = folders.find((path) => path.endsWith(`/${id}`));
  if (!folder) return Promise.resolve(none);
  if (!loading.has(id)) {
    loading.set(
      id,
      loadFeature(folder)
        .then((module) => module[id] ?? none)
        .catch((err) => {
          console.warn(`[switchboard] couldn't load the ${id} background`, err);
          return none;
        })
    );
  }
  return loading.get(id);
}

// None always comes last, after the backgrounds in features.json order.
export async function loadBackgrounds() {
  const ids = folders.map((folder) => folder.split("/").pop());
  const loaded = await Promise.all(ids.map(loadBackground));
  return [...loaded.filter((background) => background !== none), none];
}
