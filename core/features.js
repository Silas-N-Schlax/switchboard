// features.json lists every feature folder this build ships, and each folder describes itself
// in a feature.json. The lite build drops folders from the list, so nothing here assumes a
// feature exists just because the source has it.
import featureFolders from "../features.json" with { type: "json" };

export { featureFolders };

const manifests = new Map();
const modules = new Map();
const stylesheets = new Map();

export function loadFeatureManifest(folder) {
  if (!manifests.has(folder)) {
    const url = new URL(`../${folder}/feature.json`, import.meta.url);
    manifests.set(folder, import(url, { with: { type: "json" } }).then((json) => json.default));
  }
  return manifests.get(folder);
}

// The link goes in now, in the order the feature lists its styles, so the cascade matches
// the old @import order however the files finish loading.
function loadStylesheet(url) {
  if (!stylesheets.has(url.href)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url.href;
    stylesheets.set(
      url.href,
      new Promise((resolve) => {
        link.addEventListener("load", resolve, { once: true });
        link.addEventListener("error", resolve, { once: true });
      })
    );
    document.head.appendChild(link);
  }
  return stylesheets.get(url.href);
}

// Imports a feature's entry module once its stylesheets are in, so nothing it builds shows
// up unstyled.
export function loadFeature(folder) {
  if (!modules.has(folder)) {
    modules.set(
      folder,
      loadFeatureManifest(folder).then(async ({ entry, styles = [] }) => {
        const base = new URL(`../${folder}/`, import.meta.url);
        const [module] = await Promise.all([
          import(new URL(entry, base).href),
          ...styles.map((file) => loadStylesheet(new URL(file, base))),
        ]);
        return module;
      })
    );
  }
  return modules.get(folder);
}
