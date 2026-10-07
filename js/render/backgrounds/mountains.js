import { mountainsDefaultSize } from "../../../defaults.js";
import { svgEl, seededRandom, scheduleRareEvent } from "./util.js";
import { createSky } from "./sky.js";
import { launchSkydive } from "./skydive.js";

const WIDTH = 1600;
const HEIGHT = 300;
const HORIZON_Y = 170;
const SHIMMER_SEED = 20261007;
const SHIMMER_BASE_DURATION_MS = 9000;
// Matches .mountain-scene's height: the band is drawn full-width, but never shorter than this.
const BAND_ASPECT = HEIGHT / WIDTH;
const BAND_MIN_VH = 28;

const FAR_RIDGE =
  "M0 170 L0 112 L90 98 L170 74 L240 88 L330 52 L400 66 L470 40 L540 62 L610 34 " +
  "L690 22 L760 44 L820 34 L900 58 L980 44 L1060 70 L1130 54 L1210 80 L1290 64 " +
  "L1370 90 L1450 78 L1530 100 L1600 90 L1600 170 Z";

const NEAR_RIDGE =
  "M0 170 L0 120 L80 112 L160 90 L230 102 L300 80 L380 98 L450 122 L520 112 L600 134 " +
  "L680 128 L760 146 L840 140 L920 150 L1000 136 L1080 142 L1150 120 L1230 102 L1300 88 " +
  "L1360 100 L1430 80 L1510 96 L1600 90 L1600 170 Z";

// Reflections are vertically squashed (a common stylization) so sky shows below them.
const REFLECTION_SCALE = 0.55;

const RIDGE_TYPICAL_Y = 60;

// The band is always at least as tall as the full-width drawing, so it scales to fit
// its height and crops at the sides.
function bandHeightPx() {
  return Math.max(window.innerWidth * BAND_ASPECT, (window.innerHeight * BAND_MIN_VH) / 100);
}

// Roughly where the ridgeline sits on screen.
function landscapeTopVh() {
  const bandPx = bandHeightPx();
  const ridgePx = bandPx * (1 - RIDGE_TYPICAL_Y / HEIGHT);
  return 100 - (ridgePx / window.innerHeight) * 100;
}

function lakeOnScreen() {
  const bandPx = bandHeightPx();
  return { top: window.innerHeight - bandPx * (1 - HORIZON_Y / HEIGHT), bottom: window.innerHeight };
}

function buildShimmer(random, durationMs) {
  const group = svgEl("g", { class: "mountain-scene__shimmer" });
  for (let i = 0; i < 7; i++) {
    const y = HORIZON_Y + 12 + random() * (HEIGHT - HORIZON_Y - 20);
    const x = 600 + random() * 360;
    const length = 40 + random() * 110;
    const line = svgEl("line", { x1: x, y1: y, x2: x + length, y2: y });
    line.style.animationDelay = `-${random() * durationMs}ms`;
    group.appendChild(line);
  }
  return group;
}

function buildScene(speedMultiplier) {
  const svg = svgEl("svg", {
    class: "mountain-scene",
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    preserveAspectRatio: "xMidYMax slice",
    "aria-hidden": "true",
  });
  const shimmerDurationMs = SHIMMER_BASE_DURATION_MS / speedMultiplier;
  svg.style.setProperty("--shimmer-duration", `${shimmerDurationMs}ms`);

  const defs = svgEl("defs");
  const lakeGradient = svgEl("linearGradient", { id: "mountain-scene-lake", x1: "0", y1: "0", x2: "0", y2: "1" });
  lakeGradient.append(
    svgEl("stop", { offset: "0", class: "mountain-scene__lake-horizon" }),
    svgEl("stop", { offset: "1", class: "mountain-scene__lake-deep" })
  );
  const lakeClip = svgEl("clipPath", { id: "mountain-scene-water" });
  lakeClip.appendChild(svgEl("rect", { x: 0, y: HORIZON_Y, width: WIDTH, height: HEIGHT - HORIZON_Y }));
  defs.append(lakeGradient, lakeClip);

  const ranges = svgEl("g", { id: "mountain-scene-ranges" });
  ranges.append(
    svgEl("path", { class: "mountain-scene__far", d: FAR_RIDGE }),
    svgEl("path", { class: "mountain-scene__near", d: NEAR_RIDGE })
  );

  const water = svgEl("g", { "clip-path": "url(#mountain-scene-water)" });
  water.append(
    svgEl("rect", { class: "mountain-scene__lake", x: 0, y: HORIZON_Y, width: WIDTH, height: HEIGHT - HORIZON_Y }),
    svgEl("use", {
      class: "mountain-scene__reflection",
      href: "#mountain-scene-ranges",
      transform: `translate(0 ${HORIZON_Y * (1 + REFLECTION_SCALE)}) scale(1 ${-REFLECTION_SCALE})`,
    }),
    svgEl("line", { class: "mountain-scene__waterline", x1: 0, y1: HORIZON_Y, x2: WIDTH, y2: HORIZON_Y }),
    buildShimmer(seededRandom(SHIMMER_SEED), shimmerDurationMs)
  );

  svg.append(defs, ranges, water);
  return svg;
}

export const mountains = {
  id: "mountains",
  label: "Mountain",
  controls: ["count", "size", "speed"],
  sliders: [{ key: "balloonFrequency", label: "Balloon frequency" }],
  toggles: [
    { key: "birds", label: "Birds" },
    { key: "planes", label: "Planes" },
  ],
  create(container, { count, sizeMultiplier, speedMultiplier, settings = {} }) {
    createSky(container, {
      count,
      sizeMultiplier,
      speedMultiplier,
      horizonVh: landscapeTopVh(),
      balloonFrequency: settings.balloonFrequency,
      birds: settings.birds,
      planes: settings.planes,
    });
    const scene = buildScene(speedMultiplier);
    container.appendChild(scene);
    scheduleRareEvent(scene, {
      frequency: settings.balloonFrequency,
      play: () =>
        launchSkydive(container, {
          scale: Math.min(1.6, Math.max(0.6, sizeMultiplier / mountainsDefaultSize)),
          speedMultiplier,
          lake: lakeOnScreen(),
        }),
    });
    return scene;
  },
};
