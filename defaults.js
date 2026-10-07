export { reservedSystemShortcuts } from "./reservedShortcuts.js";

// ============================================================================
// Schema
// ============================================================================
export const schemaVersion = 1;

// ============================================================================
// Ambient background — color cycle
// ============================================================================
export const ambientColorCycleEnabled = true;
export const ambientColors = ["#0d0c1c", "#2c1f3d", "#3a2419", "#2a1420"];
export const ambientSegmentHours = 3;
export const ambientSegmentHourOptions = [1, 2, 3, 4, 6];
export const ambientTickIntervalMs = 15000;

export const ambientPalettePresets = [
  { id: "midnight-plum", name: "Midnight Plum", colors: ambientColors },
  { id: "deep-ocean", name: "Deep Ocean", colors: ["#061318", "#0b2530", "#123a44", "#0a2e3a"] },
  { id: "forest-dusk", name: "Forest Dusk", colors: ["#0a120a", "#122417", "#1c3324", "#26301a"] },
  { id: "rosewood", name: "Rosewood", colors: ["#160b10", "#2a1420", "#3a1a2a", "#4a2030"] },
];
export const ambientPaletteId = "midnight-plum";
export const ambientCustomColors = ambientColors;

export const ambientCuratedSwatches = [
  ...ambientPalettePresets.flatMap((p) => p.colors),
  "#1a2230",
  "#22303f",
  "#2c3e50",
  "#34495e",
  "#46607a",
  "#0d2b2b",
  "#164545",
  "#1f5f5f",
  "#2a7a7a",
  "#5fc9b4",
  "#3d2410",
  "#55350f",
  "#6b4423",
  "#8a5a2e",
  "#a3703c",
  "#232b1a",
  "#34401f",
  "#4a5427",
  "#5c6b30",
  "#748038",
];

// ============================================================================
// Ambient background — style (bubbles, fish, …), each with its own count/size/speed
// ============================================================================
export const backgroundType = "bubbles";
export const backgroundCountMin = 3;
export const backgroundCountMax = 30;
export const backgroundSizeMin = 0.1;
export const backgroundSpeedMin = 0.1;
export const backgroundSpeedMax = 3;
// Multiplier on how often a style's rare sight (shark, balloon) appears; 1 is the original rarity.
export const rareFrequencyMin = 0.5;
export const rareFrequencyMax = 10;
// Super-rare events (submarine, skydiver) also scale with the rare-sight frequency.
export const rareEventMeanIntervalMs = 30 * 60 * 1000; // at frequency 1
export const rareEventRollMs = 15000;
export const bubbleBaseSizeRange = [60, 220]; // px, before size multiplier
export const bubbleBaseDurationRange = [16000, 30000]; // ms, before speed multiplier
export const fishDefaultSize = 0.15; // one slider step above the minimum
export const fishSizeScaleMax = 2.5; // fish size at the top of the slider, vs. the default
export const fishBaseSizeRange = [28, 72]; // px body length at the default size
export const fishBaseDurationRange = [22000, 40000]; // ms per screen crossing, before speed multiplier
export const mountainsDefaultSize = 0.5; // sky elements draw at base size here; the slider scales 0.2x–2x
export const skyCloudBaseWidthRange = [160, 380]; // px
export const skyCloudBaseDurationRange = [90000, 160000]; // ms per screen crossing, before speed multiplier
export const skyBirdBaseSizeRange = [24, 42]; // px wingspan
export const skyBirdBaseDurationRange = [26000, 44000];
export const skyPlaneBaseSizeRange = [28, 42]; // px length
export const skyPlaneBaseDurationRange = [30000, 45000];
export const skyBalloonBaseSizeRange = [44, 68]; // px tall
export const skyBalloonBaseDurationRange = [70000, 100000];
// Rolled once per crossing at frequency 1; about one balloon every 4–5 minutes, like the
// fish shark. Higher frequencies add balloon slots once the chance would pass 100%.
export const skyBalloonChance = 0.3;
// How many of each the Count slider spawns, per unit of count.
export const skyCountRatios = { clouds: 1, birds: 0.5, planes: 0.2 };

export const backgroundStyleDefaults = {
  bubbles: { count: 8, size: 1, speed: 1 },
  fish: {
    count: 8,
    size: fishDefaultSize,
    speed: 1,
    sharkFrequency: 1,
    sharkEats: true,
    seaFloor: true,
    seaSurface: true,
  },
  mountains: { count: 8, size: mountainsDefaultSize, speed: 1, balloonFrequency: 1, birds: true, planes: true },
};

// ============================================================================
// Tabs & links
// ============================================================================
export const defaultTabs = [{ id: "tab-1", name: "Home", order: 0, shortcutKey: "1" }];
export const defaultLinks = [];
export const defaultLinkGroups = [];
export const linkGroupLimit = 3;
export const linkGroupLimitRange = [1, 9];
export const linkListSplitThreshold = 6;
// null means the list never splits.
export const linkListSplitThresholdOptions = [4, 6, 8, 10, 12, null];
export const showFullUrl = false;
export const openLinksInNewTab = false;
export const sortDragThresholdPx = 4;
export const sortFlipDurationMs = 180;
export const maxTabs = 9;
export const defaultTabId = null;

// ============================================================================
// Keybinds
// ============================================================================
// Single source of truth for every registered keybind's default key. Stored
// per-user in settings.keybinds (see defaultSettings below) so any binding
// here can be overridden without touching this file.
export const defaultKeybinds = {
  "tab-switch-1": "1",
  "tab-switch-2": "2",
  "tab-switch-3": "3",
  "tab-switch-4": "4",
  "tab-switch-5": "5",
  "tab-switch-6": "6",
  "tab-switch-7": "7",
  "tab-switch-8": "8",
  "tab-switch-9": "9",
  "search-focus": "s",
  "cheatsheet-open": "/",
  "settings-open": ",",
  "launch-group": "l",
  "launch-group-edit": "Shift+L",
};

// ============================================================================
// Search
// ============================================================================
export const searchEngines = [
  { id: "google", name: "Google", url: "https://www.google.com/search?q=" },
  { id: "duckduckgo", name: "DuckDuckGo", url: "https://duckduckgo.com/?q=" },
  { id: "bing", name: "Bing", url: "https://www.bing.com/search?q=" },
  { id: "kagi", name: "Kagi", url: "https://kagi.com/search?q=" },
  { id: "brave", name: "Brave Search", url: "https://search.brave.com/search?q=" },
];
export const searchEngineId = "google";

// Border shown around the search bar when the current query has no link matches
// and Enter would fall back to a web search.
export const searchFallbackColor = "#b5665f";
export const searchFallbackSwatches = [
  "#b5665f",
  "#d4766b",
  "#c98a4b",
  "#7fb86f",
  "#5fc9b4",
  "#5fb3c9",
  "#6f9fd8",
  "#8a7fd4",
  "#b07fd4",
  "#d47fa8",
];

// ============================================================================
// General settings
// ============================================================================
export const showFavicons = false;
// Requested at 2x the 16px display size so icons stay sharp on high-DPI screens.
export const faviconFetchSize = 32;
export const faviconHistoryCandidateLimit = 3;
export const cacheTrimEnabled = false;
export const statsEnabled = true;
export const showKeycapHints = true;
// Takes keyboard focus from the address bar when a new tab opens — see js/main.js.
export const focusPageOnOpen = true;
// Only takes effect while focusPageOnOpen is on; the address bar keeps focus otherwise.
export const focusSearchOnOpen = false;
export const feedbackUrl = "https://forms.gle/23ozsD4amrUqTjGe7";

// ============================================================================
// Composed defaults — the shapes js/schema.js and js/storage.js actually consume
// ============================================================================
export const defaultAmbientSettings = {
  colorCycleEnabled: ambientColorCycleEnabled,
  paletteId: ambientPaletteId,
  customColors: ambientCustomColors,
  segmentHours: ambientSegmentHours,
  backgroundType,
  backgroundStyles: backgroundStyleDefaults,
};

export const defaultSettings = {
  showFavicons,
  cacheTrimEnabled,
  statsEnabled,
  showKeycapHints,
  focusPageOnOpen,
  focusSearchOnOpen,
  defaultTabId,
  searchEngineId,
  searchFallbackColor,
  linkListSplitThreshold,
  linkGroupLimit,
  showFullUrl,
  openLinksInNewTab,
  ambientMode: defaultAmbientSettings,
  backgroundConfig: { mode: "ambient" },
  keybinds: defaultKeybinds,
};
