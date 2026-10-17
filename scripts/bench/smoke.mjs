// Quick check that a build works: loads it as an unpacked extension in headless Chromium,
// shows every background its features.json lists, then opens Settings and Release notes.
// Fails on any console error, failed request, or missing piece.
// Usage: node smoke.mjs [extension folder]  (the repo root when omitted; e.g. an unzipped dist build)
// Set CHROME to a Chromium binary to use it instead of Playwright's own download.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ext = path.resolve(process.argv[2] || fileURLToPath(new URL("../../", import.meta.url)));
const backgrounds = JSON.parse(readFileSync(path.join(ext, "features.json"), "utf8"))
  .filter((folder) => folder.startsWith("features/backgrounds/"))
  .map((folder) => path.basename(folder));
const releaseNotesShipped = JSON.parse(readFileSync(path.join(ext, "features.json"), "utf8")).includes("features/releaseNotes");

const ctx = await chromium.launchPersistentContext("", {
  channel: "chromium",
  headless: true,
  executablePath: process.env.CHROME || undefined,
  viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent("serviceworker");
const page = await ctx.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(e.message));
page.on("console", (m) => m.type() === "error" && problems.push(m.text()));
page.on("requestfailed", (r) => problems.push(`request failed: ${r.url()}`));

await page.goto(`chrome-extension://${new URL(sw.url()).host}/switchboard.html?focus`);
await page.waitForSelector(".tab-dock__tab");

for (const id of [...backgrounds, "none"]) {
  await page.evaluate(async (id) => {
    const { settings } = await chrome.storage.local.get("settings");
    settings.ambientMode = { ...settings.ambientMode, backgroundType: id };
    await chrome.storage.local.set({ settings });
  }, id);
  await page.reload();
  await page.waitForSelector(".ambient-bg");
  await page.waitForTimeout(400);
  // The sky layer is always there; a background adds at least one more layer.
  const layers = await page.evaluate(() => document.querySelector(".ambient-bg").childElementCount);
  if (id !== "none" && layers < 2) problems.push(`${id} background didn't render`);
  console.log(`background ${id}: ok`);
}

await page.keyboard.press(",");
await page.waitForSelector(".settings-panel--open", { timeout: 5000 }).catch(() => problems.push("settings didn't open"));
const hasPicker = await page.evaluate(() =>
  [...document.querySelectorAll(".dialog-group__label")].some((label) => label.textContent === "Background style")
);
if (hasPicker !== backgrounds.length > 0) problems.push(`background picker ${hasPicker ? "shown" : "missing"} with ${backgrounds.length} backgrounds`);
console.log("settings: ok");

if (releaseNotesShipped) {
  await page.click(".settings-panel__release-notes");
  await page.waitForSelector(".release-notes--open", { timeout: 5000 }).catch(() => problems.push("release notes didn't open"));
  const rows = await page.evaluate(() => document.querySelectorAll(".release-notes__row").length);
  if (!rows) problems.push("release notes list no features");
  console.log(`release notes: ${rows} feature rows`);
}

await ctx.close();
if (problems.length) {
  console.error(`\nFAILED (${ext}):\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`\npassed: ${ext}`);
