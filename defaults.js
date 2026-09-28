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
export const ambientTickIntervalMs = 15000;

export const ambientPalettePresets = [
  { id: "midnight-plum", name: "Midnight Plum", colors: ambientColors },
  { id: "daylight", name: "Daylight", colors: ["#eae6df", "#ded2d8", "#e4cdb2", "#dcbcb6"] },
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
// Ambient background — bubbles
// ============================================================================
export const bubblesEnabled = true;
export const bubbleCount = 8;
export const bubbleCountMin = 3;
export const bubbleSizeMultiplier = 1;
export const bubbleSizeMultiplierMin = 0.1;
export const bubbleSpeedMultiplier = 1;
export const bubbleSpeedMultiplierMin = 0.1;
export const bubbleSpeedMultiplierMax = 3;
export const bubbleBaseSizeRange = [60, 220]; // px, before size multiplier
export const bubbleBaseDurationRange = [16000, 30000]; // ms, before speed multiplier

// ============================================================================
// Tabs & links
// ============================================================================
export const defaultTabs = [{ id: "tab-1", name: "Home", order: 0, shortcutKey: "1" }];
export const defaultLinks = [];
export const linkListSplitThreshold = 6;
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
// Border shown around the search bar when the current query has no link matches
// and Enter would fall back to a Google search. Not yet wired to settings —
// hardcoded for now, but kept here so it's a one-line change to make it
// user-customizable later.
export const searchGoogleModeColor = "#b5665f";

// ============================================================================
// General settings
// ============================================================================
export const showFavicons = false;
export const cacheTrimEnabled = false;
export const mostUsedTabEnabled = false;

// ============================================================================
// Composed defaults — the shapes js/schema.js and js/storage.js actually consume
// ============================================================================
export const defaultAmbientSettings = {
  colorCycleEnabled: ambientColorCycleEnabled,
  paletteId: ambientPaletteId,
  customColors: ambientCustomColors,
  segmentHours: ambientSegmentHours,
  bubblesEnabled,
  bubbleCount,
  bubbleSizeMultiplier,
  bubbleSpeedMultiplier,
};

export const defaultSettings = {
  showFavicons,
  cacheTrimEnabled,
  mostUsedTabEnabled,
  defaultTabId,
  ambientMode: defaultAmbientSettings,
  backgroundConfig: { mode: "ambient" },
  keybinds: defaultKeybinds,
};
