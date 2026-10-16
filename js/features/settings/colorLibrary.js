import { state } from "../../state.js";
import { updateSettings } from "./store.js";
import {
  ambientCuratedSwatches,
  ambientPalettePresets,
  colorLibraryPaletteLimit,
  colorLibrarySwatchLimit,
} from "../../../defaults.js";

const PALETTE_SIZE = 4;
const NAME_MAX_LENGTH = 40;

export function importedFiles() {
  return state.settings.colorLibrary?.files ?? [];
}

// Two files can bring the same palette; the first one listed wins.
export function importedPalettes() {
  const seen = new Set();
  return importedFiles()
    .flatMap((file) => file.palettes)
    .filter((palette) => {
      const key = paletteKey(palette.colors);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function importedSwatches() {
  return [...new Set(importedFiles().flatMap((file) => file.swatches))];
}

export function availableSwatches() {
  return [...ambientCuratedSwatches, ...importedSwatches()];
}

// Without a "#", only six digits count, so words in a text file like "bad" or "cafe"
// aren't read as colors.
function normalizeHex(value) {
  if (typeof value !== "string") return null;
  const match = /^(#)?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match || (!match[1] && match[2].length === 3)) return null;
  const digits = match[2].length === 3 ? [...match[2]].map((d) => d + d).join("") : match[2];
  return `#${digits.toLowerCase()}`;
}

function channelHex(value) {
  return Math.max(0, Math.min(255, Number(value))).toString(16).padStart(2, "0");
}

// GIMP palettes list "R G B name" rows under a header; anything else is read as a
// list of hex colors split on whitespace or commas (Lospec .hex, copied lists).
function parseColorList(text) {
  if (text.startsWith("GIMP Palette")) {
    return text
      .split("\n")
      .map((line) => /^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\b/.exec(line))
      .filter(Boolean)
      .map(([, r, g, b]) => `#${channelHex(r)}${channelHex(g)}${channelHex(b)}`);
  }
  return text.split(/[\s,;]+/).map(normalizeHex).filter(Boolean);
}

function readPalette(raw, fallbackName) {
  const colors = (Array.isArray(raw?.colors) ? raw.colors : []).map(normalizeHex).filter(Boolean);
  if (colors.length < PALETTE_SIZE) return null;
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : fallbackName;
  return { name: name.slice(0, NAME_MAX_LENGTH), colors: colors.slice(0, PALETTE_SIZE) };
}

// Accepts { palettes, swatches }, a single { name, colors }, an array of either palettes
// or hex strings, or a plain color list. A list of exactly four colors also becomes a
// palette named after the file.
export function parsePaletteFile(fileName, text) {
  const baseName = fileName.replace(/\.[^.]+$/, "") || "Imported palette";
  const trimmed = text.trim().replace(/^﻿/, "");
  let rawPalettes = [];
  let rawSwatches = [];

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let json;
    try {
      json = JSON.parse(trimmed);
    } catch {
      throw new Error(`${fileName} isn't valid JSON.`);
    }
    if (Array.isArray(json)) {
      rawSwatches = json.filter((item) => typeof item === "string");
      rawPalettes = json.filter((item) => item && typeof item === "object");
    } else if (json && typeof json === "object") {
      rawPalettes = Array.isArray(json.palettes) ? json.palettes : json.colors ? [json] : [];
      rawSwatches = Array.isArray(json.swatches) ? json.swatches : [];
    }
  } else {
    rawSwatches = parseColorList(trimmed);
    if (rawSwatches.length === PALETTE_SIZE) rawPalettes = [{ name: baseName, colors: rawSwatches }];
  }

  const palettes = rawPalettes.map((raw, i) => readPalette(raw, rawPalettes.length > 1 ? `${baseName} ${i + 1}` : baseName));
  const swatches = rawSwatches.map(normalizeHex).filter(Boolean);
  const valid = palettes.filter(Boolean);
  if (!valid.length && !swatches.length) {
    throw new Error(`No colors found in ${fileName}. Use hex colors like #1a2230.`);
  }
  return { palettes: valid, swatches, skippedPalettes: palettes.length - valid.length };
}

function paletteKey(colors) {
  return colors.join(",");
}

function newId(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

// Each file keeps its full set of palettes and colors (only the built-ins are left out),
// so removing one file never takes away a color another file also brought. Palette
// colors join the file's swatches, the way the built-in presets' colors do. A file that
// adds nothing new isn't kept, and both totals stop at their limit.
export async function addPaletteFile(fileName, { palettes, swatches }) {
  const presetKeys = new Set(ambientPalettePresets.map((p) => paletteKey(p.colors)));
  const importedKeys = new Set(importedPalettes().map((p) => paletteKey(p.colors)));
  let paletteRoom = colorLibraryPaletteLimit - importedKeys.size;
  let overLimit = false;
  let added = 0;
  const filePalettes = [];
  for (const palette of palettes) {
    const key = paletteKey(palette.colors);
    if (presetKeys.has(key) || filePalettes.some((p) => paletteKey(p.colors) === key)) continue;
    if (!importedKeys.has(key)) {
      if (paletteRoom <= 0) {
        overLimit = true;
        continue;
      }
      paletteRoom -= 1;
      added += 1;
    }
    filePalettes.push({ id: newId("imported"), ...palette });
  }

  const curated = new Set(ambientCuratedSwatches);
  const imported = new Set(importedSwatches());
  let swatchRoom = colorLibrarySwatchLimit - imported.size;
  const fileSwatches = [];
  let newSwatches = 0;
  for (const hex of new Set([...filePalettes.flatMap((p) => p.colors), ...swatches])) {
    if (curated.has(hex)) continue;
    if (!imported.has(hex)) {
      if (swatchRoom <= 0) {
        overLimit = true;
        continue;
      }
      swatchRoom -= 1;
      newSwatches += 1;
    }
    fileSwatches.push(hex);
  }

  if (added || newSwatches) {
    const file = { id: newId("file"), name: fileName, palettes: filePalettes, swatches: fileSwatches };
    await updateSettings({ colorLibrary: { files: [...importedFiles(), file] } });
  }
  return { palettes: added, swatches: newSwatches, overLimit };
}

export async function removePaletteFile(fileId) {
  await updateSettings({ colorLibrary: { files: importedFiles().filter((file) => file.id !== fileId) } });
}
