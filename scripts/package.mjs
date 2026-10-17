// Builds the store zips: dist/switchboard-<version>.zip with every feature, and
// dist/switchboard-lite-<version>.zip without the features whose feature.json says
// "lite": false. Either build fails if features.json and the feature folders disagree, or if
// anything it ships points at a file that isn't in it.
// Usage: node scripts/package.mjs [full|lite]  (both when omitted)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const shipped = [
  "manifest.json",
  "switchboard.html",
  "background.js",
  "defaults.js",
  "reservedShortcuts.js",
  "features.json",
  "release.json",
  "core",
  "shared",
  "features",
  "graphics",
];

const variants = {
  full: { slug: "switchboard", keeps: () => true, manifest: {} },
  lite: {
    slug: "switchboard-lite",
    keeps: (feature) => feature.lite,
    // graphics/lite mirrors graphics/ and replaces the icons and favicon it has.
    graphics: "graphics/lite",
    manifest: {
      name: "Switchboard Lite",
      description:
        "Switchboard without the animated backgrounds: a fast, keyboard-first New Tab with local link workspaces.",
    },
  },
};

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const problems = [];
const fail = (message) => problems.push(message);
function stopIfFailed(context) {
  if (!problems.length) return;
  console.error(`${context}:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}

function findFeatureJsons(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findFeatureJsons(full);
    return entry.name === "feature.json" ? [path.dirname(full)] : [];
  });
}

// Checks the source tree once: every listed folder describes itself properly, every
// feature.json is listed, and the version being shipped has release notes.
function loadFeatures(base) {
  const folders = readJson(path.join(base, "features.json"));
  const onDisk = findFeatureJsons(path.join(base, "features")).map((dir) => path.relative(base, dir));
  onDisk.filter((dir) => !folders.includes(dir)).forEach((dir) => fail(`${dir} has a feature.json but isn't in features.json`));

  const features = folders.flatMap((folder) => {
    const file = path.join(base, folder, "feature.json");
    if (!fs.existsSync(file)) return fail(`features.json lists ${folder}, which has no feature.json`), [];
    const feature = readJson(file);
    const where = `${folder}/feature.json`;
    ["id", "name", "summary", "added"].forEach((key) => typeof feature[key] !== "string" && fail(`${where} needs a "${key}"`));
    if (typeof feature.lite !== "boolean") fail(`${where} needs "lite": true or false`);
    if (feature.id !== path.basename(folder)) fail(`${where} has id "${feature.id}" but its folder is ${path.basename(folder)}`);
    [feature.entry, ...(feature.styles ?? [])].filter(Boolean).forEach((file) => {
      if (!fs.existsSync(path.join(base, folder, file))) fail(`${where} names ${file}, which doesn't exist`);
    });
    return [{ ...feature, folder }];
  });

  const ids = new Set(features.map((f) => f.id));
  features.forEach((f) => (f.requires ?? []).forEach((id) => !ids.has(id) && fail(`${f.folder} requires "${id}", which isn't a feature`)));
  return features;
}

// Every relative import, CSS url() and HTML src/href in the build must land on a file in it.
function checkReferences(dir) {
  const walk = (d) =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const patterns = {
    ".js": /(?:from\s*|import\s*\(?\s*)"(\.{1,2}\/[^"]+)"/g,
    ".css": /url\("(?!data:)([^"]+)"\)/g,
    ".html": /(?:src|href)="([^":]+)"/g,
  };
  for (const file of walk(dir)) {
    const pattern = patterns[path.extname(file)];
    if (!pattern) continue;
    for (const [, ref] of fs.readFileSync(file, "utf8").matchAll(pattern)) {
      if (!fs.existsSync(path.resolve(path.dirname(file), ref))) {
        fail(`${path.relative(dir, file)} points at ${ref}, which isn't in this build`);
      }
    }
  }
  const manifest = readJson(path.join(dir, "manifest.json"));
  [manifest.background.service_worker, manifest.chrome_url_overrides.newtab, ...Object.values(manifest.icons)].forEach(
    (ref) => !fs.existsSync(path.join(dir, ref)) && fail(`manifest.json points at ${ref}, which isn't in this build`)
  );
}

function build(variantName, features, version) {
  const variant = variants[variantName];
  const name = `${variant.slug}-${version}`;
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), `${variant.slug}-`));
  const out = path.join(staging, name);
  try {
    fs.mkdirSync(out);
    shipped.forEach((entry) => fs.cpSync(path.join(root, entry), path.join(out, entry), { recursive: true }));
    fs.readdirSync(path.join(out, "graphics/extension"))
      .filter((f) => f.startsWith("chrome-store-"))
      .forEach((f) => fs.rmSync(path.join(out, "graphics/extension", f)));
    if (variant.graphics) fs.cpSync(path.join(out, variant.graphics), path.join(out, "graphics"), { recursive: true });
    fs.rmSync(path.join(out, "graphics/lite"), { recursive: true, force: true });
    execFileSync("find", [out, "-name", ".DS_Store", "-delete"]);

    const kept = features.filter(variant.keeps);
    const dropped = features.filter((f) => !variant.keeps(f));
    const droppedIds = new Set(dropped.map((f) => f.id));
    kept.forEach((f) =>
      (f.requires ?? []).filter((id) => droppedIds.has(id)).forEach((id) => fail(`${f.id} stays in ${variantName} but requires ${id}, which doesn't`))
    );
    dropped.forEach((f) => fs.rmSync(path.join(out, f.folder), { recursive: true }));
    // A group's shared/ folder (features/backgrounds/shared) only serves that group's features.
    const groups = new Set(features.map((f) => path.dirname(f.folder)).filter((dir) => dir !== "features"));
    groups.forEach((group) => {
      if (!kept.some((f) => path.dirname(f.folder) === group)) fs.rmSync(path.join(out, group, "shared"), { recursive: true, force: true });
    });
    fs.writeFileSync(path.join(out, "features.json"), JSON.stringify(kept.map((f) => f.folder), null, 2) + "\n");

    const manifest = { ...readJson(path.join(out, "manifest.json")), ...variant.manifest };
    fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    fs.writeFileSync(path.join(out, "INSTALL.txt"), installText(manifest.name));

    checkReferences(out);
    stopIfFailed(`Can't build ${variantName}`);

    const zip = path.join(root, "dist", `${name}.zip`);
    fs.mkdirSync(path.dirname(zip), { recursive: true });
    fs.rmSync(zip, { force: true });
    execFileSync("zip", ["-qr", zip, name], { cwd: staging });
    const droppedNote = dropped.length ? ` (without ${dropped.map((f) => f.id).join(", ")})` : "";
    console.log(`${path.relative(root, zip)}${droppedNote}`);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

function installText(name) {
  return `${name}: install in Brave, Chrome, Edge, or Vivaldi

1. Unzip this file and move the folder somewhere permanent (e.g. Documents).
   The browser loads it from that folder, so don't delete or move it afterwards.
2. Open brave://extensions (chrome://extensions in Chrome, edge://extensions in Edge).
3. Turn on "Developer mode" (top right).
4. Click "Load unpacked" and choose this folder (the one containing manifest.json).
5. Open a new tab. If the browser asks whether to keep the extension's new tab page,
   choose Keep.

Brave notes
- Changing Brave's theme can switch the extension off. If your new tab goes back to
  Brave's default, re-enable ${name} in brave://extensions.
- Brave's own new-tab settings (background images, widgets) stop applying while
  ${name} is on.

Everything stays on your computer. Settings > Data > Switchboard backup > Export makes
a backup file.

Updating: replace this folder with the new version, then click the reload icon on
${name} in the extensions page. Your tabs and links are kept.
`;
}

const requested = process.argv[2] ? [process.argv[2]] : Object.keys(variants);
requested.filter((v) => !variants[v]).forEach((v) => fail(`unknown build "${v}" (use ${Object.keys(variants).join(" or ")})`));
const { version } = readJson(path.join(root, "manifest.json"));
const features = loadFeatures(root);
if (!readJson(path.join(root, "release.json")).releases.some((r) => r.version === version)) {
  fail(`release.json has no entry for ${version}, the version in manifest.json`);
}
stopIfFailed("Can't package");
requested.forEach((v) => build(v, features, version));
