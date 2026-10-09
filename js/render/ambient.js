import {
  ambientColorCycleEnabled,
  ambientPalettePresets,
  ambientPaletteId,
  ambientCustomColors,
  ambientSegmentHours,
  ambientTickIntervalMs,
  backgroundType as defaultBackgroundType,
  backgroundCountMin,
  backgroundSizeMin,
  backgroundSpeedMin,
  backgroundSpeedMax,
  backgroundStyleDefaults,
} from "../../defaults.js";
import { findBackground } from "./backgrounds/index.js";

export function resolveColors(ambientMode = {}) {
  const paletteId = ambientMode.paletteId ?? ambientPaletteId;
  if (paletteId === "custom") {
    return ambientMode.customColors?.length ? ambientMode.customColors : ambientCustomColors;
  }
  const preset = ambientPalettePresets.find((p) => p.id === paletteId);
  return preset ? preset.colors : ambientCustomColors;
}

const ANCHOR_MINUTES = 8 * 60; // 8am

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function lerpRgb(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgbToCss([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`;
}

function shadeRgb([r, g, b], percent) {
  const target = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  return [lerp(r, target, p), lerp(g, target, p), lerp(b, target, p)];
}

// One picked base color becomes a 3-stop gradient (darker / base / lighter) so a single
// color picker still gives the layered depth the visual design calls for.
function deriveStops(baseHex) {
  const rgb = hexToRgb(baseHex);
  return [shadeRgb(rgb, -0.35), rgb, shadeRgb(rgb, 0.16)];
}

function getCurrentBlend({ colors, colorCycleEnabled, segmentHours }) {
  if (!colorCycleEnabled || colors.length < 2) {
    return deriveStops(colors[0]).map(rgbToCss);
  }

  const segmentMinutes = segmentHours * 60;
  const cycleMinutes = segmentMinutes * colors.length;

  const now = new Date();
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const elapsed = (minutesSinceMidnight - ANCHOR_MINUTES + 1440) % cycleMinutes;

  const segmentIndex = Math.floor(elapsed / segmentMinutes) % colors.length;
  const progress = (elapsed % segmentMinutes) / segmentMinutes;
  const fromStops = deriveStops(colors[segmentIndex]);
  const toStops = deriveStops(colors[(segmentIndex + 1) % colors.length]);
  return fromStops.map((stop, i) => rgbToCss(lerpRgb(stop, toStops[i], progress)));
}

function applyPalette(root, [c1, c2, c3]) {
  root.style.setProperty("--bg-1", c1);
  root.style.setProperty("--bg-2", c2);
  root.style.setProperty("--bg-3", c3);
}

let renderGeneration = 0;

export function renderAmbient(root = document.body, settings = {}) {
  renderGeneration += 1;
  const myGeneration = renderGeneration;

  const ambientMode = settings.ambientMode ?? {};
  const colors = resolveColors(ambientMode);
  const colorCycleEnabled = ambientMode.colorCycleEnabled ?? ambientColorCycleEnabled;
  const segmentHours = ambientMode.segmentHours ?? ambientSegmentHours;
  const background = findBackground(ambientMode.backgroundType ?? defaultBackgroundType);

  const style = { ...backgroundStyleDefaults[background.id], ...ambientMode.backgroundStyles?.[background.id] };
  const count = Math.max(backgroundCountMin, style.count ?? backgroundCountMin);
  const sizeMultiplier = clamp(style.size ?? 1, backgroundSizeMin, 1);
  const speedMultiplier = clamp(style.speed ?? 1, backgroundSpeedMin, backgroundSpeedMax);

  // Re-rendering (settings changed) replaces the previous background in place.
  document.querySelector(".ambient-bg")?.remove();

  const container = document.createElement("div");
  container.className = "ambient-bg";
  root.prepend(container);

  const skyLayer = document.createElement("div");
  skyLayer.className = "ambient-bg__sky";
  container.appendChild(skyLayer);

  background.create?.(container, { count, sizeMultiplier, speedMultiplier, settings: style });

  const blendConfig = { colors, colorCycleEnabled, segmentHours };

  function tick() {
    if (myGeneration !== renderGeneration) return; // superseded by a newer render
    applyPalette(document.documentElement, getCurrentBlend(blendConfig));
    requestAnimationFrame(scheduleNextTick);
  }
  let lastTickAt = 0;
  function scheduleNextTick(timestamp) {
    if (myGeneration !== renderGeneration) return; // superseded by a newer render
    if (timestamp - lastTickAt >= ambientTickIntervalMs) {
      lastTickAt = timestamp;
      tick();
    } else {
      requestAnimationFrame(scheduleNextTick);
    }
  }

  applyPalette(document.documentElement, getCurrentBlend(blendConfig));
  if (colorCycleEnabled) {
    requestAnimationFrame(scheduleNextTick);
  }
}
