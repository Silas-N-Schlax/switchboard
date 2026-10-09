import { svgEl, seededRandom, randomBetween, randomInRange, createSpawnField } from "./util.js";

// Same framing as the mountain scene: a 1600x900 canvas, bottom-aligned and cropped to
// cover, so scenery and critters share one coordinate system.
const WIDTH = 1600;
const HEIGHT = 900;
const SAND_Y = 812;
const FLOOR_SEED = 31337;
const KELP_COUNT = 8;
const STARFISH_COUNT = 2;

const SAND_FAR = "M0 900 L0 792 C220 778 420 800 640 788 C860 776 1060 798 1280 786 C1440 778 1530 790 1600 784 L1600 900 Z";
const SAND_NEAR = "M0 900 L0 814 C200 800 400 820 600 810 C800 800 1000 818 1200 808 C1400 798 1500 812 1600 806 L1600 900 Z";

function viewport() {
  const scale = Math.max(window.innerWidth / WIDTH, window.innerHeight / HEIGHT);
  return {
    scale,
    x: (vx) => window.innerWidth / 2 + (vx - WIDTH / 2) * scale,
    y: (vy) => window.innerHeight - (HEIGHT - vy) * scale,
  };
}

function sceneSvg(className) {
  return svgEl("svg", {
    class: className,
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    preserveAspectRatio: "xMidYMax slice",
    "aria-hidden": "true",
  });
}

function rock(x, width, height) {
  const half = width / 2;
  return `M${x - half} ${SAND_Y + 6} Q${x - half + 4} ${SAND_Y - height} ${x - half * 0.2} ${SAND_Y - height - 4} ` +
    `Q${x + half * 0.7} ${SAND_Y - height} ${x + half} ${SAND_Y + 6} Z`;
}

function brainCoral(x, r) {
  const dome = svgEl("path", {
    class: "sea-floor__coral",
    d: `M${x - r} ${SAND_Y + 4} A${r} ${r * 0.8} 0 0 1 ${x + r} ${SAND_Y + 4} Z`,
  });
  const grooves = svgEl("path", {
    class: "sea-floor__groove",
    d: [0.35, 0.6, 0.82]
      .map((k) => `M${x - r * k} ${SAND_Y + 2} Q${x} ${SAND_Y - r * 0.8 * k * 1.1} ${x + r * k} ${SAND_Y + 2}`)
      .join(" "),
  });
  return [dome, grooves];
}

function branchCoral(random, x, height) {
  const byDepth = [[], [], []];
  function grow(px, py, angle, length, depth) {
    const nx = px + Math.cos(angle) * length;
    const ny = py + Math.sin(angle) * length;
    byDepth[depth].push(`M${px.toFixed(1)} ${py.toFixed(1)} L${nx.toFixed(1)} ${ny.toFixed(1)}`);
    if (depth === 2) return;
    const spread = 0.35 + random() * 0.25;
    grow(nx, ny, angle - spread, length * (0.62 + random() * 0.15), depth + 1);
    grow(nx, ny, angle + spread, length * (0.62 + random() * 0.15), depth + 1);
  }
  grow(x, SAND_Y + 4, -Math.PI / 2 + (random() - 0.5) * 0.3, height * 0.42, 0);
  return byDepth.map((segments, depth) =>
    svgEl("path", { class: "sea-floor__branch", d: segments.join(" "), "stroke-width": 9 - depth * 2.5 })
  );
}

function fanCoral(x, height) {
  const width = height * 0.9;
  const fan = svgEl("path", {
    class: "sea-floor__fan",
    d: `M${x} ${SAND_Y + 2} L${x - width / 2} ${SAND_Y - height * 0.7} Q${x} ${SAND_Y - height * 1.15} ${x + width / 2} ${SAND_Y - height * 0.7} Z`,
  });
  const veins = svgEl("path", {
    class: "sea-floor__vein",
    d: Array.from({ length: 7 }, (_, i) => {
      const t = (i + 0.5) / 7 - 0.5;
      return `M${x} ${SAND_Y + 2} Q${x + t * width * 0.6} ${SAND_Y - height * 0.5} ${x + t * width * 0.95} ${SAND_Y - height * (0.75 + 0.2 * (0.5 - Math.abs(t)))}`;
    }).join(" "),
  });
  return [fan, veins];
}

function seagrass(random, x) {
  const blades = Array.from({ length: 3 + Math.floor(random() * 3) }, () => {
    const lean = (random() - 0.5) * 30;
    const height = 18 + random() * 26;
    return `M${x + (random() - 0.5) * 8} ${SAND_Y + 6} Q${x + lean * 0.3} ${SAND_Y - height * 0.6} ${x + lean} ${SAND_Y - height}`;
  });
  return svgEl("path", { class: "sea-floor__grass", d: blades.join(" ") });
}

function buildScenery(random) {
  const svg = sceneSvg("sea-floor");
  svg.append(
    svgEl("path", { class: "sea-floor__sand-far", d: SAND_FAR }),
    svgEl("path", { class: "sea-floor__rock", d: rock(230, 130, 46) }),
    svgEl("path", { class: "sea-floor__rock", d: rock(1010, 90, 30) }),
    svgEl("path", { class: "sea-floor__rock", d: rock(1430, 150, 54) }),
    ...fanCoral(120, 110),
    ...branchCoral(random, 330, 150),
    ...brainCoral(470, 46),
    ...fanCoral(760, 80),
    ...branchCoral(random, 900, 120),
    ...brainCoral(1130, 38),
    ...branchCoral(random, 1290, 170),
    ...fanCoral(1520, 120),
    svgEl("path", { class: "sea-floor__sand", d: SAND_NEAR }),
    ...[60, 410, 560, 690, 840, 1060, 1210, 1360, 1580].map((x) => seagrass(random, x))
  );
  return svg;
}

function kelpStrand(random, index) {
  const depth = random();
  const x = ((index + 0.15 + random() * 0.7) / KELP_COUNT) * WIDTH;
  const top = 480 + random() * 130;
  const width = 5 + depth * 5;
  const nodes = [];
  for (let y = SAND_Y + 6, i = 0; y > top; y -= 70, i++) nodes.push([x + (i % 2 ? 1 : -1) * (3 + random() * 4), y]);
  nodes.push([x, top]);

  let stem = `M${nodes[0][0]} ${nodes[0][1]}`;
  for (let i = 1; i < nodes.length; i++) {
    const [px, py] = nodes[i - 1];
    const [nx, ny] = nodes[i];
    stem += ` Q${px} ${(py + ny) / 2} ${nx} ${ny}`;
  }
  const blades = nodes.slice(1, -1).map(([nx, ny], i) => {
    const side = i % 2 ? 1 : -1;
    const length = 30 + random() * 22;
    const tipX = nx + side * length * 0.8;
    const tipY = ny - length;
    return `M${nx} ${ny} C${nx + side * length * 0.9} ${ny - length * 0.1} ${tipX + side * 6} ${tipY + length * 0.35} ${tipX} ${tipY} ` +
      `C${tipX - side * 10} ${tipY + length * 0.3} ${nx + side * 4} ${ny - length * 0.4} ${nx} ${ny} Z`;
  });

  const svg = sceneSvg(`sea-floor__kelp sea-floor__kelp--${depth < 0.34 ? "back" : depth < 0.67 ? "mid" : "front"}`);
  svg.style.zIndex = String(1 + Math.round(depth * 8));
  const strand = svgEl("g", { class: "sea-floor__kelp-strand" });
  strand.style.animationDuration = `${6 + random() * 5}s`;
  strand.style.animationDelay = `-${random() * 10}s`;
  strand.append(
    svgEl("path", { class: "sea-floor__kelp-stem", d: stem, "stroke-width": width }),
    svgEl("path", { class: "sea-floor__kelp-blade", d: blades.join(" ") })
  );
  svg.appendChild(strand);
  return svg;
}

function critterSvg(viewBox, parts) {
  const svg = svgEl("svg", { class: "sea-critter__body", viewBox, "aria-hidden": "true" });
  svg.append(...parts.map(([cls, d, extra = {}]) => svgEl("path", { class: cls, d, ...extra })));
  return svg;
}

function starPath(cx, cy, outer, inner, squash = 1) {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / 5 + 0.3;
    return `${i ? "L" : "M"}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r * squash).toFixed(1)}`;
  }).join(" ") + " Z";
}

// Pre-flattened as if lying on the sand, with a soft shadow; base at the bottom centre.
const STARFISH = () =>
  critterSvg("0 0 40 24", [
    ["sea-critter__shadow", "M4 20 a16 3 0 1 0 32 0 a16 3 0 1 0 -32 0"],
    ["sea-critter__star", starPath(20, 13, 17, 7, 0.5)],
  ]);

// Samples the near sand's top edge once, so critters can sit exactly on the dunes.
function groundSampler(sandPath) {
  const length = sandPath.getTotalLength();
  const points = [];
  for (let l = 0; l <= length; l += 8) {
    const { x, y } = sandPath.getPointAtLength(l);
    if (y < HEIGHT - 20) points.push([x, y]);
  }
  points.sort((a, b) => a[0] - b[0]);

  return (screenX) => {
    const view = viewport();
    const vx = (screenX - window.innerWidth / 2) / view.scale + WIDTH / 2;
    const i = points.findIndex(([x]) => x >= vx);
    if (i === -1) return view.y(points[points.length - 1][1]);
    if (i === 0) return view.y(points[0][1]);
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    return view.y(y0 + ((y1 - y0) * (vx - x0)) / (x1 - x0 || 1));
  };
}

// Follows the fish size slider; set per render by createSeaFloor.
let critterScale = 1;

// One size per critter for its whole stay, in the scene's scale.
function critterWidth(el, range) {
  if (!el.dataset.size) el.dataset.size = String(randomInRange(range));
  return Number(el.dataset.size) * viewport().scale * critterScale;
}

// The sand is a ground plane: u runs across the screen, v from its back edge (0) to the
// bottom of the screen (1). Nearer spots are lower, larger, and drawn in front.
function planePoint(groundY, u, v) {
  const x = u * window.innerWidth;
  const top = groundY(x) + 4 * viewport().scale;
  const bottom = window.innerHeight - 4;
  return { x, y: top + v * Math.max(0, bottom - top) };
}

function depthScale(v) {
  return 0.65 + 0.55 * v;
}

function nextSpot(el, { across, deeper }) {
  const u0 = Number(el.dataset.u ?? randomBetween(0.05, 0.95));
  const v0 = Number(el.dataset.v ?? randomBetween(0.1, 0.9));
  let u1 = u0 + randomInRange(across) * (Math.random() < 0.5 ? -1 : 1);
  if (u1 < 0.03 || u1 > 0.97) u1 = 2 * u0 - u1;
  const v1 = Math.min(0.95, Math.max(0.05, v0 + randomBetween(-deeper, deeper)));
  el.dataset.u = String(u1);
  el.dataset.v = String(v1);
  return { u0, v0, u1, v1 };
}

// Stands the sprite's feet (bottom centre) on the plane point; depth scaling pivots there.
function placeOnPlane(el, groundY, width, aspect, { u0, v0, u1, v1 }) {
  const from = planePoint(groundY, u0, v0);
  const to = planePoint(groundY, u1, v1);
  const height = width * aspect;
  el.style.setProperty("--w", `${width}px`);
  el.style.setProperty("--from-x", `${from.x - width / 2}px`);
  el.style.setProperty("--from-y", `${from.y - height}px`);
  el.style.setProperty("--to-x", `${to.x - width / 2}px`);
  el.style.setProperty("--to-y", `${to.y - height}px`);
  el.style.setProperty("--s-from", String(depthScale(v0)));
  el.style.setProperty("--s-to", String(depthScale(v1)));
  el.style.zIndex = String(10 + Math.round(((v0 + v1) / 2) * 5));
  return { from, to };
}

// Starfish creep very slowly across the floor.
function starfishField(container, speed, groundY) {
  return createSpawnField(container, {
    className: "sea-critters",
    count: STARFISH_COUNT,
    createItem() {
      const star = document.createElement("div");
      star.className = "sea-critter sea-critter--starfish";
      star.appendChild(STARFISH());
      return star;
    },
    randomize(el) {
      const width = critterWidth(el, { min: 24, max: 34 });
      placeOnPlane(el, groundY, width, 24 / 40, nextSpot(el, { across: { min: 0.02, max: 0.05 }, deeper: 0.15 }));
      const duration = randomBetween(90000, 150000) / speed;
      el.style.setProperty("--duration", `${duration}ms`);
      return randomBetween(0, duration);
    },
    placeStatic() {},
  });
}

export function createSeaFloor(container, { speedMultiplier = 1, sizeScale = 1 } = {}) {
  critterScale = sizeScale;
  const random = seededRandom(FLOOR_SEED);
  const scenery = buildScenery(random);
  container.appendChild(scenery);
  for (let i = 0; i < KELP_COUNT; i++) container.appendChild(kelpStrand(random, i));
  const groundY = groundSampler(scenery.querySelector(".sea-floor__sand"));
  starfishField(container, speedMultiplier, groundY);
}
