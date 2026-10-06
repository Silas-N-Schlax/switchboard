import { svgEl, seededRandom } from "./util.js";

const WIDTH = 1600;
const HEIGHT = 900;
const HORIZON_Y = 620;
const TREE_SEED = 20261006;
const SHIMMER_BASE_DURATION_MS = 9000;

const FAR_RIDGE =
  "M0 620 L0 500 L90 470 L170 430 L240 455 L330 380 L400 410 L470 350 L540 395 L610 330 " +
  "L690 300 L760 345 L820 320 L900 370 L980 340 L1060 390 L1130 360 L1210 410 L1290 380 " +
  "L1370 430 L1450 405 L1530 450 L1600 430 L1600 620 Z";

const NEAR_RIDGE =
  "M0 620 L0 520 L80 500 L160 455 L230 480 L300 430 L380 470 L450 520 L520 500 L600 545 " +
  "L680 530 L760 570 L840 555 L920 575 L1000 545 L1080 560 L1150 510 L1230 470 L1300 440 " +
  "L1360 465 L1430 420 L1510 455 L1600 440 L1600 620 Z";

// Reflections are vertically squashed (a common stylization) so sky shows below them.
const REFLECTION_SCALE = 0.55;

const LEFT_BANK = "M0 900 L0 640 Q300 652 640 706 Q600 790 520 900 Z";
const RIGHT_BANK = "M1600 900 L1600 646 Q1300 656 980 712 Q1020 790 1100 900 Z";

function treePath(x, baseY, height) {
  const halfWidth = height * 0.17;
  const tierY = baseY - height * 0.45;
  return (
    `M${x - halfWidth} ${baseY} L${x - halfWidth * 0.55} ${tierY} ` +
    `L${x - halfWidth * 0.8} ${tierY} L${x} ${baseY - height} ` +
    `L${x + halfWidth * 0.8} ${tierY} L${x + halfWidth * 0.55} ${tierY} L${x + halfWidth} ${baseY} Z`
  );
}

// A row of trees whose base follows the line from `from` to `to`, shrinking by `taper`
// toward `to` (farther from the viewer); mirrored for the right bank.
function treeRow(random, { from, to, count, heightRange, taper = 0, mirror }) {
  let d = "";
  for (let i = 0; i < count; i++) {
    const t = (i + random() * 0.8) / count;
    const x = from[0] + (to[0] - from[0]) * t;
    const baseY = from[1] + (to[1] - from[1]) * t + random() * 12;
    const height = (heightRange[0] + random() * (heightRange[1] - heightRange[0])) * (1 - taper * t);
    d += treePath(mirror ? WIDTH - x : x, baseY, height);
  }
  return d;
}

function forestPaths() {
  const random = seededRandom(TREE_SEED);
  const back = { from: [-10, 646], to: [630, 712], count: 42, heightRange: [70, 130], taper: 0.55 };
  const mid = { from: [-10, 720], to: [540, 790], count: 24, heightRange: [120, 190], taper: 0.4 };
  const front = { from: [-30, 860], to: [300, 940], count: 7, heightRange: [240, 360] };
  const mirrored = (row, from, to) => treeRow(random, { ...row, from, to, mirror: true });
  return {
    back: treeRow(random, back) + mirrored(back, [-10, 652], [630, 718]),
    front:
      treeRow(random, mid) +
      treeRow(random, front) +
      mirrored(mid, [-10, 728], [560, 800]) +
      mirrored(front, [-30, 870], [280, 950]),
  };
}

function buildShimmer(random, durationMs) {
  const group = svgEl("g", { class: "mountain-scene__shimmer" });
  for (let i = 0; i < 7; i++) {
    const y = HORIZON_Y + 30 + random() * 240;
    const x = 600 + random() * 360;
    const length = 50 + random() * 150;
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
    buildShimmer(seededRandom(TREE_SEED + 1), shimmerDurationMs)
  );

  const forest = forestPaths();
  svg.append(
    defs,
    ranges,
    water,
    svgEl("path", { class: "mountain-scene__trees-back", d: forest.back }),
    svgEl("path", { class: "mountain-scene__bank", d: LEFT_BANK }),
    svgEl("path", { class: "mountain-scene__bank", d: RIGHT_BANK }),
    svgEl("path", { class: "mountain-scene__trees-front", d: forest.front })
  );
  return svg;
}

export const mountains = {
  id: "mountains",
  label: "Mountain lake",
  controls: ["speed"],
  create(container, { speedMultiplier }) {
    const scene = buildScene(speedMultiplier);
    container.appendChild(scene);
    return scene;
  },
};
