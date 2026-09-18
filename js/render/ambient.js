import {
  ambientColorCycleEnabled,
  ambientPalettePresets,
  ambientPaletteId,
  ambientCustomColors,
  ambientSegmentHours,
  bubblesEnabled as defaultBubblesEnabled,
  bubbleCount as defaultBubbleCount,
  bubbleCountMin,
  bubbleSizeMultiplier as defaultBubbleSizeMultiplier,
  bubbleSizeMultiplierMin,
  bubbleSpeedMultiplier as defaultBubbleSpeedMultiplier,
  bubbleSpeedMultiplierMin,
  bubbleSpeedMultiplierMax,
  bubbleBaseSizeRange,
  bubbleBaseDurationRange,
} from "../../defaults.js";

export function resolveColors(ambientMode = {}) {
  const paletteId = ambientMode.paletteId ?? ambientPaletteId;
  if (paletteId === "custom") {
    return ambientMode.customColors?.length ? ambientMode.customColors : ambientCustomColors;
  }
  const preset = ambientPalettePresets.find((p) => p.id === paletteId);
  return preset ? preset.colors : ambientCustomColors;
}

const ANCHOR_MINUTES = 8 * 60; // 8am

const prefersReducedMotion = window.matchMedia?.(
  "(prefers-reduced-motion: reduce)"
).matches;

const DEV_SEGMENT_SECONDS = 10;

let devFastForward = false;
let devFastForwardStartedAt = null;

window.__switchboardDevSpeed = (on = true) => {
  devFastForward = on;
  devFastForwardStartedAt = on ? Date.now() : null;
  console.log(`[switchboard] dev fast-forward ${on ? "ON" : "off"}`);
};

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
  const devCycleSeconds = DEV_SEGMENT_SECONDS * colors.length;

  let elapsed;
  if (devFastForward) {
    const elapsedSeconds = (Date.now() - devFastForwardStartedAt) / 1000;
    const minutesPerRealSecond = cycleMinutes / devCycleSeconds;
    elapsed = (elapsedSeconds * minutesPerRealSecond) % cycleMinutes;
  } else {
    const now = new Date();
    const minutesSinceMidnight =
      now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    elapsed = (minutesSinceMidnight - ANCHOR_MINUTES + 1440) % cycleMinutes;
  }

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

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomizeBubble(el, sizeMultiplier, speedMultiplier) {
  const size = randomBetween(...bubbleBaseSizeRange) * sizeMultiplier;
  const duration = randomBetween(...bubbleBaseDurationRange) / speedMultiplier;
  el.style.setProperty("--size", `${size}px`);
  el.style.setProperty("--start-x", `${randomBetween(0, 100)}vw`);
  el.style.setProperty("--drift-x", `${randomBetween(-15, 15)}vw`);
  el.style.setProperty("--start-y", `${randomBetween(0, 100)}vh`);
  el.style.setProperty("--drift-y", `${randomBetween(-20, -5)}vh`);
  el.style.setProperty("--duration", `${duration}ms`);
  // restart the CSS animation from its 0% keyframe
  el.style.animation = "none";
  // eslint-disable-next-line no-unused-expressions
  el.offsetHeight;
  el.style.animation = "";
}

function createBubbleField(container, { count, sizeMultiplier, speedMultiplier }) {
  const field = document.createElement("div");
  field.className = "bubble-field";
  container.appendChild(field);

  for (let i = 0; i < count; i++) {
    const bubble = document.createElement("div");
    bubble.className = "bubble-field__bubble";
    randomizeBubble(bubble, sizeMultiplier, speedMultiplier);

    if (prefersReducedMotion) {
      // Keep the bubbles as a static visual element, just without the drift/respawn
      // motion — the planning doc calls for disabling the *animations*, not the shapes.
      bubble.style.animation = "none";
      bubble.style.opacity = "0.9";
      bubble.style.transform = `translate(var(--start-x), var(--start-y))`;
    } else {
      bubble.style.animationDelay = `-${randomBetween(0, 8000)}ms`;
      // One-shot animation per "life" (fade in -> drift -> fade out); on end, pick new
      // randomized values and force-restart so it respawns elsewhere rather than
      // looping the exact same path.
      bubble.addEventListener("animationend", () =>
        randomizeBubble(bubble, sizeMultiplier, speedMultiplier)
      );
    }
    field.appendChild(bubble);
  }
  return field;
}

function createDevSpeedToggle() {
  const button = document.createElement("button");
  button.className = "dev-speed-toggle";
  button.type = "button";
  button.textContent = "⏩ dev: speed cycle";
  button.setAttribute("aria-label", "Toggle fast-forwarded color-loop preview");
  button.addEventListener("click", () => {
    window.__switchboardDevSpeed(!devFastForward);
    button.classList.toggle("dev-speed-toggle--active", devFastForward);
  });
  return button;
  // to be deleted before end of development
}

let renderGeneration = 0;

export function renderAmbient(root = document.body, settings = {}) {
  renderGeneration += 1;
  const myGeneration = renderGeneration;

  const ambientMode = settings.ambientMode ?? {};
  const colors = resolveColors(ambientMode);
  const colorCycleEnabled = ambientMode.colorCycleEnabled ?? ambientColorCycleEnabled;
  const segmentHours = ambientMode.segmentHours ?? ambientSegmentHours;
  const bubblesOn = ambientMode.bubblesEnabled ?? defaultBubblesEnabled;
  
  const bubbleCount = Math.max(bubbleCountMin, ambientMode.bubbleCount ?? defaultBubbleCount);
  const sizeMultiplier = clamp(
    ambientMode.bubbleSizeMultiplier ?? defaultBubbleSizeMultiplier,
    bubbleSizeMultiplierMin,
    1
  );
  const speedMultiplier = clamp(
    ambientMode.bubbleSpeedMultiplier ?? defaultBubbleSpeedMultiplier,
    bubbleSpeedMultiplierMin,
    bubbleSpeedMultiplierMax
  );

  // Re-rendering (settings changed) replaces the previous background/bubbles in place.
  document.querySelector(".ambient-bg")?.remove();

  const container = document.createElement("div");
  container.className = "ambient-bg";
  root.prepend(container);

  const skyLayer = document.createElement("div");
  skyLayer.className = "ambient-bg__sky";
  container.appendChild(skyLayer);

  if (bubblesOn) {
    createBubbleField(container, { count: bubbleCount, sizeMultiplier, speedMultiplier });
  }

  if (!document.querySelector(".dev-speed-toggle")) {
    root.appendChild(createDevSpeedToggle());
  }

  const blendConfig = { colors, colorCycleEnabled, segmentHours };

  function tick() {
    if (myGeneration !== renderGeneration) return; // superseded by a newer render
    applyPalette(document.documentElement, getCurrentBlend(blendConfig));
    requestAnimationFrame(scheduleNextTick);
  }
  let lastTickAt = 0;
  function scheduleNextTick(timestamp) {
    if (myGeneration !== renderGeneration) return; // superseded by a newer render
    // Recompute colors often enough to look smooth: every ~100ms during the 10s/segment
    // dev preview, every ~15s during the real hours/segment cycle.
    const interval = devFastForward ? 100 : 15000;
    if (timestamp - lastTickAt >= interval) {
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
