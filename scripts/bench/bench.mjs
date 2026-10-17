// Switchboard performance + stress benchmark. Loads the repo as an unpacked extension in
// headless Chromium and measures load, interaction, background, leak and storage costs.
// Usage: npm run bench [-- section,...]  (sections: app, bg, leak, stress, startup, devices)
// EXT=<checkout> benchmarks another build; LABEL=<name> names its results file.
// Set CHROME to a Chromium binary to use it instead of Playwright's own download.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

// EXT points at another checkout (say, a worktree of main) to benchmark that build instead.
const ext = process.env.EXT || fileURLToPath(new URL("../../", import.meta.url));
const only = process.argv[2]?.split(",");
const want = (s) => !only || only.includes(s);
const results = {};

const ctx = await chromium.launchPersistentContext("", {
  channel: "chromium",
  headless: true,
  executablePath: process.env.CHROME || undefined,
  viewport: { width: 1440, height: 900 },
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, "--enable-precise-memory-info", "--js-flags=--expose-gc"],
});
let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent("serviceworker");
const id = new URL(sw.url()).host;
const url = `chrome-extension://${id}/switchboard.html?focus`;

const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const cdp = await ctx.newCDPSession(page);
await cdp.send("Performance.enable");

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};
const p95 = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))];
};
const r1 = (n) => (n == null ? n : Math.round(n * 10) / 10);

async function gc() {
  await cdp.send("HeapProfiler.collectGarbage");
}
async function counters() {
  const dom = await cdp.send("Memory.getDOMCounters");
  const { usedSize } = await cdp.send("Runtime.getHeapUsage");
  return { heapMB: r1(usedSize / 1048576), nodes: dom.nodes, listeners: dom.jsEventListeners, documents: dom.documents };
}
async function metrics() {
  const { metrics } = await cdp.send("Performance.getMetrics");
  return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
}

async function load() {
  await page.goto(url);
  await page.waitForSelector(".tab-dock__tab");
}

// Writes a generated dataset straight into chrome.storage.local, then reloads.
async function seed({ tabs, linksPerTab, groupsPerTab = 0, background = "none", stats = 0, statsEnabled = false, style = {} }) {
  await load();
  await page.evaluate(
    async ({ tabs, linksPerTab, groupsPerTab, background, stats, statsEnabled, style }) => {
      const { createTab, createLink, createLinkGroup } = await import("/core/schema.js");
      const current = await chrome.storage.local.get(null);
      await chrome.storage.local.clear();
      const T = [], L = [], G = [];
      for (let t = 0; t < tabs; t++) {
        const tabId = `tab-${t + 1}`;
        T.push(createTab({ id: tabId, name: `Tab ${t + 1}`, order: t }));
        const groupIds = [];
        for (let g = 0; g < groupsPerTab; g++) {
          const gid = `g-${t}-${g}`;
          groupIds.push(gid);
          G.push(createLinkGroup({ id: gid, tabId, name: `Group ${g + 1}`, order: g }));
        }
        for (let i = 0; i < linksPerTab; i++) {
          const groupId = groupIds.length && i % 2 ? groupIds[i % groupIds.length] : null;
          L.push(
            createLink({
              id: `l-${t}-${i}`,
              label: `Link ${t}-${i} ${["docs", "mail", "calendar", "github", "news", "music"][i % 6]}`,
              url: `https://site${i % 97}.example.com/path/${t}/${i}?q=${i}`,
              tabId,
              groupId,
              order: i,
              launchGroup: i < 3,
              launchOrder: i < 3 ? i : null,
            })
          );
        }
      }
      const settings = current.settings;
      settings.statsEnabled = statsEnabled;
      settings.focusSearchOnOpen = false;
      settings.ambientMode.backgroundType = background;
      settings.ambientMode.backgroundStyles[background] = { ...settings.ambientMode.backgroundStyles[background], ...style };
      const data = { schemaVersion: current.schemaVersion, tabs: T, links: L, linkGroups: G, settings };
      if (stats) {
        // Spread over the last 30 days and filed under the build's own bucket keys, so an
        // older build (monthly buckets) and a newer one (daily) hold the same history.
        const { statsBucketKey } = await import("/features/stats/recorder.js");
        const spacing = (30 * 86400000) / stats;
        for (let i = 0; i < stats; i++) {
          const t = Date.now() - i * spacing;
          const key = statsBucketKey(new Date(t));
          (data[key] ??= []).push({ t, type: "link-open", linkId: `l-0-${i % 50}`, tabId: "tab-1", via: "click" });
        }
      }
      await chrome.storage.local.set(data);
    },
    { tabs, linksPerTab, groupsPerTab, background, stats, statsEnabled, style }
  );
  await load();
}

// Runs fn in the page and times it through the next two frames (paint included).
const inPageHelpers = `
  window.__frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__key = (key, opts = {}, target = document.body) =>
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...opts }));
`;

// ---------------------------------------------------------------- app workload
if (want("app")) {
  const sets = {
    small: { tabs: 3, linksPerTab: 10, groupsPerTab: 0 },
    typical: { tabs: 9, linksPerTab: 40, groupsPerTab: 3 },
    large: { tabs: 9, linksPerTab: 200, groupsPerTab: 3 },
    extreme: { tabs: 9, linksPerTab: 1000, groupsPerTab: 9 },
  };
  results.app = {};
  for (const [name, set] of Object.entries(sets)) {
    await seed(set);
    const bytes = await page.evaluate(async () => chrome.storage.local.getBytesInUse(null));

    // Cold loads: navigation start to the first link row existing, read in the page.
    // (Waiting for a frame here would round every result to the frame rate.)
    const loads = [];
    for (let i = 0; i < 5; i++) {
      await page.goto(url, { waitUntil: "commit" });
      await page.waitForSelector(".link-list__row, .link-list__add-tile");
      loads.push(await page.evaluate(() => performance.now()));
    }
    await page.evaluate(inPageHelpers);
    await gc();
    const mem = await counters();

    // Tab switches 1..9 repeated, each timed through paint.
    const switches = await page.evaluate(async (tabs) => {
      const out = [];
      for (let round = 0; round < 3; round++)
        for (let t = 1; t <= tabs; t++) {
          const t0 = performance.now();
          __key(String(t));
          await __frame();
          out.push(performance.now() - t0);
        }
      return out;
    }, set.tabs);

    // Search keystrokes: each character re-filters every link across every tab.
    const search = await page.evaluate(async () => {
      __key("s");
      await __frame();
      const input = document.querySelector(".search-bar input");
      const out = [];
      for (const q of ["l", "li", "lin", "link", "link 4", "github", "zz-no-match"]) {
        const t0 = performance.now();
        input.value = q;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        await __frame();
        out.push(performance.now() - t0);
      }
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      __key("Escape", {}, input);
      await __frame();
      return out;
    });

    // Settings panel open / close, and the shortcuts sheet.
    const dialogs = await page.evaluate(async () => {
      const t = async (fn) => {
        const t0 = performance.now();
        fn();
        await __frame();
        return performance.now() - t0;
      };
      const settingsOpen = await t(() => __key(","));
      const settingsClose = await t(() => __key("Escape", {}, document.querySelector(".settings-panel__dialog") ?? document.body));
      const sheetOpen = await t(() => __key("/"));
      const sheetClose = await t(() => __key("Escape", {}, document.activeElement ?? document.body));
      return { settingsOpen, settingsClose, sheetOpen, sheetClose };
    });

    results.app[name] = {
      links: set.tabs * set.linksPerTab,
      storageKB: r1(bytes / 1024),
      loadMs: { median: r1(median(loads)), all: loads.map(r1) },
      ...mem,
      tabSwitchMs: { median: r1(median(switches)), p95: r1(p95(switches)), max: r1(Math.max(...switches)) },
      searchKeystrokeMs: { median: r1(median(search)), max: r1(Math.max(...search)) },
      dialogsMs: Object.fromEntries(Object.entries(dialogs).map(([k, v]) => [k, r1(v)])),
    };
    console.log("app", name, JSON.stringify(results.app[name]));
  }
}

// ---------------------------------------------------------------- backgrounds
if (want("bg")) {
  const bgs = ["none", "bubbles", "fish", "mountains", "stratosphere", "bounce"];
  const variants = {
    default: {},
    max: { count: 30, size: 1, speed: 3 },
  };
  results.backgrounds = {};
  for (const bg of bgs) {
    for (const [variant, style] of Object.entries(variants)) {
      if (bg === "none" && variant === "max") continue;
      await seed({ tabs: 9, linksPerTab: 40, groupsPerTab: 3, background: bg, style });
      await page.waitForTimeout(3000); // let spawns settle
      await gc();
      const before = await metrics();
      const sample = await page.evaluate(async () => {
        const longTasks = [];
        const obs = new PerformanceObserver((l) => l.getEntries().forEach((e) => longTasks.push(e.duration)));
        obs.observe({ type: "longtask", buffered: false });
        const frames = [];
        let last = performance.now();
        const end = last + 5000;
        await new Promise((resolve) => {
          const tick = (now) => {
            frames.push(now - last);
            last = now;
            if (now < end) requestAnimationFrame(tick);
            else resolve();
          };
          requestAnimationFrame(tick);
        });
        obs.disconnect();
        return {
          frames,
          longTasks,
          animations: document.getAnimations().length,
          bgNodes: document.querySelector(".ambient-bg")?.querySelectorAll("*").length ?? 0,
        };
      });
      const after = await metrics();
      const secs = 5;
      const pct = (k) => r1(((after[k] - before[k]) / secs) * 100);
      const mem = await counters();
      const frames = sample.frames.slice(1);
      results.backgrounds[`${bg}:${variant}`] = {
        fps: r1(frames.length / secs),
        worstFrameMs: r1(Math.max(...frames)),
        jankFrames: frames.filter((f) => f > 50).length,
        longTasks: sample.longTasks.length,
        cpuTaskPct: pct("TaskDuration"),
        scriptPct: pct("ScriptDuration"),
        stylePct: pct("RecalcStyleDuration"),
        layoutPct: pct("LayoutDuration"),
        animations: sample.animations,
        bgNodes: sample.bgNodes,
        heapMB: mem.heapMB,
      };
      console.log("bg", bg, variant, JSON.stringify(results.backgrounds[`${bg}:${variant}`]));
    }
  }
}

// ---------------------------------------------------------------- leaks
// Each UI action runs once (its first use may build things for good), then 20 more times;
// growth per repeat is a leak. Backgrounds are redrawn by resizing, then left 40 s to let go.
if (want("leak")) {
  results.leak = { actions: {}, resize: {} };
  const settle = async () => {
    for (let i = 0; i < 3; i++) await gc();
    const d = await cdp.send("Memory.getDOMCounters");
    return { nodes: d.nodes, listeners: d.jsEventListeners };
  };
  const actions = {
    settings: async () => { __key(","); await __frame(); __key("Escape", {}, document.querySelector(".settings-panel__dialog")); await __frame(); },
    cheatsheet: async () => { __key("/"); await __frame(); __key("Escape", {}, document.activeElement); await __frame(); },
    tabSwitch: async () => { for (let t = 1; t <= 9; t++) { __key(String(t)); await __frame(); } },
    search: async () => {
      const i = document.querySelector(".search-bar input");
      i.value = "l"; i.dispatchEvent(new Event("input", { bubbles: true })); await __frame();
      i.value = ""; i.dispatchEvent(new Event("input", { bubbles: true })); await __frame();
    },
    contextMenu: async () => {
      const a = document.querySelector(".link-list__label"); a.focus();
      __key("m", {}, a); await __frame(); __key("Escape", {}, document.activeElement); await __frame();
    },
  };
  for (const [name, act] of Object.entries(actions)) {
    await seed({ tabs: 9, linksPerTab: 20 });
    await page.evaluate(inPageHelpers);
    await page.waitForTimeout(1000);
    const run = () => page.evaluate(`(${act.toString()})()`);
    const base = await settle();
    await run();
    const first = await settle();
    for (let i = 0; i < 20; i++) await run();
    const many = await settle();
    results.leak.actions[name] = {
      firstUse: { nodes: first.nodes - base.nodes, listeners: first.listeners - base.listeners },
      perRepeat: { nodes: r1((many.nodes - first.nodes) / 20), listeners: r1((many.listeners - first.listeners) / 20) },
    };
    console.log("leak", name, JSON.stringify(results.leak.actions[name]));
  }
  for (const bg of ["bubbles", "fish", "mountains", "stratosphere", "bounce"]) {
    await seed({ tabs: 9, linksPerTab: 20, background: bg });
    await page.waitForTimeout(1500);
    const before = await settle();
    for (let i = 0; i < 10; i++) {
      await page.setViewportSize({ width: 1200 + (i % 2) * 240, height: 850 });
      await page.waitForTimeout(450);
    }
    await page.waitForTimeout(1000);
    const after = await settle();
    await page.waitForTimeout(40000);
    const later = await settle();
    await page.setViewportSize({ width: 1440, height: 900 });
    results.leak.resize[bg] = { before, after10Resizes: after, after40s: later };
    console.log("leak resize", bg, JSON.stringify(results.leak.resize[bg]));
  }
}

// ---------------------------------------------------------------- import + storage stress
if (want("stress")) {
  results.stress = {};
  await seed({ tabs: 3, linksPerTab: 10 });
  await page.evaluate(inPageHelpers);

  // Bookmarks file parse at increasing sizes.
  results.stress.bookmarksParseMs = await page.evaluate(async () => {
    const { parseBookmarksHtml } = await import("/features/bookmarks/tree.js");
    const out = {};
    for (const n of [1000, 10000, 50000]) {
      const folders = 50;
      const per = n / folders;
      let html = "<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p>";
      for (let f = 0; f < folders; f++) {
        html += `<DT><H3>Folder ${f}</H3><DL><p>`;
        for (let i = 0; i < per; i++) html += `<DT><A HREF="https://f${f}.example.com/${i}">Bookmark ${f}-${i}</A>`;
        html += "</DL><p>";
      }
      html += "</DL><p>";
      const t0 = performance.now();
      const parsed = parseBookmarksHtml(html);
      out[n] = { ms: Math.round(performance.now() - t0), folders: parsed.folders.length, bytesKB: Math.round(html.length / 1024) };
    }
    return out;
  });

  // Importing many bookmarks into one new tab, then rendering that tab.
  results.stress.bookmarksImport = await page.evaluate(async () => {
    const { importBookmarks } = await import("/features/bookmarks/importStore.js");
    const out = {};
    for (const n of [1000, 5000]) {
      const links = Array.from({ length: n }, (_, i) => ({ title: `Imported ${n}-${i}`, url: `https://imp${n}.example.com/${i}` }));
      const rows = [{ include: true, asGroup: false, destination: `new:Import ${n}`, folder: { name: `F${n}`, path: [`F${n}`], links } }];
      const t0 = performance.now();
      const res = await importBookmarks(rows, "file");
      out[n] = { ms: Math.round(performance.now() - t0), added: res.added };
    }
    return out;
  });
  // Re-render with the imported tabs active.
  await load();
  await page.evaluate(inPageHelpers);
  results.stress.renderImportedTabMs = await page.evaluate(async () => {
    const out = [];
    for (const k of ["4", "5"]) {
      const t0 = performance.now();
      __key(k);
      await __frame();
      out.push(Math.round(performance.now() - t0));
    }
    return out;
  });

  // Stats: each event re-reads and re-writes the whole month bucket.
  results.stress.statsWriteMs = {};
  for (const n of [0, 5000, 20000, 60000]) {
    await seed({ tabs: 3, linksPerTab: 10, stats: n, statsEnabled: true });
    const r = await page.evaluate(async () => {
      const { recordEvent } = await import("/features/stats/recorder.js");
      const times = [];
      for (let i = 0; i < 10; i++) {
        const t0 = performance.now();
        await recordEvent("link-open", { linkId: "x", tabId: "tab-1", via: "bench" });
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      return { medianMs: Math.round(times[5] * 10) / 10, bytesKB: Math.round((await chrome.storage.local.getBytesInUse(null)) / 1024) };
    });
    results.stress.statsWriteMs[n] = r;
    console.log("stats", n, JSON.stringify(r));
  }

  // Palette file parse.
  results.stress.paletteParseMs = await page.evaluate(async () => {
    const { parsePaletteFile } = await import("/features/settings/colorLibrary.js");
    const hexes = Array.from({ length: 20000 }, (_, i) => `#${(i * 2654435761 >>> 8).toString(16).padStart(6, "0").slice(0, 6)}`).join("\n");
    const t0 = performance.now();
    const parsed = parsePaletteFile("big.hex", hexes);
    return { ms: Math.round(performance.now() - t0), swatches: parsed.swatches.length };
  });
  console.log("stress", JSON.stringify(results.stress));
}

// ---------------------------------------------------------------- startup
// New-tab load through the focus redirect (how every new tab opens by default) versus
// straight to ?focus, and with a large stats month.
if (want("startup")) {
  results.startup = {};
  const base = url.replace("?focus", "");
  // Wall clock from asking for the page to the tab dock existing, the thrown-away redirect
  // page included. Waiting on a frame here would round every result to the frame rate.
  const timeLoads = async (target) => {
    const out = [];
    for (let i = 0; i < 10; i++) {
      const t0 = performance.now();
      await page.goto(target, { waitUntil: "commit" });
      await page.waitForSelector(".tab-dock__tab");
      out.push(performance.now() - t0);
    }
    return r1(median(out));
  };
  for (const background of ["none", "bubbles"]) {
    await seed({ tabs: 9, linksPerTab: 40, groupsPerTab: 3, background });
    results.startup[background] = { directMs: await timeLoads(url), redirectMs: await timeLoads(base) };
  }
  for (const stats of [0, 20000, 60000]) {
    await seed({ tabs: 9, linksPerTab: 40, groupsPerTab: 3, background: "bubbles", stats, statsEnabled: true });
    results.startup[`stats${stats}`] = { directMs: await timeLoads(url) };
  }
  console.log("startup", JSON.stringify(results.startup));
}

// ---------------------------------------------------------------- devices
// Slows the CPU down with DevTools throttling (as Lighthouse does) to estimate slower
// machines: 4x is a mid-range laptop, 6x a budget laptop or Chromebook, 20x an old netbook.
if (want("devices")) {
  results.devices = {};
  const base = url.replace("?focus", "");
  const keyTimes = (keys) =>
    page.evaluate(async (keys) => {
      const out = [];
      for (const k of keys) {
        const t0 = performance.now();
        __key(k);
        await __frame();
        out.push(performance.now() - t0);
      }
      return out;
    }, keys);
  for (const rate of [1, 4, 6, 20]) {
    const row = {};
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await seed({ tabs: 9, linksPerTab: 40, groupsPerTab: 3, background: "bubbles" });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });

    // New tab opened the default way, through the page-focus redirect.
    const loads = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      await page.goto(base, { waitUntil: "commit" });
      await page.waitForSelector(".tab-dock__tab");
      loads.push(performance.now() - t0);
    }
    row.newTabMs = r1(median(loads));
    await page.evaluate(inPageHelpers);
    row.tabSwitchMs = r1(median(await keyTimes(["2", "3", "4", "5", "6", "7", "8", "9", "1", "2", "3"])));

    // Search over 1,800 links, after a warm-up keystroke.
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await seed({ tabs: 9, linksPerTab: 200, groupsPerTab: 3, background: "none" });
    await page.evaluate(inPageHelpers);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    const search = await page.evaluate(async () => {
      const input = document.querySelector(".search-bar input");
      input.focus();
      const type = async (q) => {
        const t0 = performance.now();
        input.value = q;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        await __frame();
        return performance.now() - t0;
      };
      await type("warm");
      const out = [];
      for (const q of ["l", "li", "lin", "link", "link 4", "link 4-1", "l"]) out.push(await type(q));
      return out;
    });
    row.searchKeystrokeMs = r1(median(search));

    // Each background at default settings: frame rate and main-thread share.
    row.backgrounds = {};
    for (const bg of ["bubbles", "fish", "mountains", "stratosphere", "bounce"]) {
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      await seed({ tabs: 9, linksPerTab: 40, groupsPerTab: 3, background: bg });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate });
      await page.waitForTimeout(2500);
      const before = await metrics();
      const frames = await page.evaluate(async () => {
        let n = 0;
        let worst = 0;
        let last = performance.now();
        const end = last + 4000;
        await new Promise((resolve) => {
          const tick = (now) => {
            n++;
            worst = Math.max(worst, now - last);
            last = now;
            if (now < end) requestAnimationFrame(tick);
            else resolve();
          };
          requestAnimationFrame(tick);
        });
        return { fps: n / 4, worst };
      });
      const after = await metrics();
      row.backgrounds[bg] = {
        fps: r1(frames.fps),
        worstFrameMs: r1(frames.worst),
        mainThreadPct: r1(((after.TaskDuration - before.TaskDuration) / 4) * 100),
      };
    }
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    results.devices[`${rate}x`] = row;
    console.log("devices", `${rate}x`, JSON.stringify(row));
  }
}

results.errors = [...new Set(errors)];
const outDir = new URL("./results/", import.meta.url);
mkdirSync(outDir, { recursive: true });
// LABEL names the results file, so runs of two builds don't overwrite each other.
const name = [process.env.LABEL, only?.join("-") ?? "all"].filter(Boolean).join("-");
writeFileSync(new URL(`./${name}.json`, outDir), JSON.stringify(results, null, 2));
console.log("errors", JSON.stringify(results.errors));
await ctx.close();
