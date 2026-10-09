import { svgEl, randomBetween, randomInRange, prefersReducedMotion, animationDone } from "./util.js";
import { rowerParts, bladeIsWet } from "./rowing.js";

const TILE = 1600; // wave paths repeat every TILE units, so a -50% scroll loops seamlessly
const RAY_COUNT = 5;
const GLINT_COUNT = 6;
const BOAT_DELAY_MS = { min: 120000, max: 270000 };

function wavePath(baseline, amplitude, period) {
  let d = `M0 0 L0 ${baseline}`;
  for (let x = 0; x < TILE * 2; x += period) {
    d += ` Q${x + period / 4} ${baseline - amplitude} ${x + period / 2} ${baseline}`;
    d += ` Q${x + (period * 3) / 4} ${baseline + amplitude} ${x + period} ${baseline}`;
  }
  return `${d} L${TILE * 2} 0 Z`;
}

function waveLayer(className, baseline, amplitude, period) {
  const svg = svgEl("svg", {
    class: `sea-surface__waves ${className}`,
    viewBox: `0 0 ${TILE * 2} 100`,
    preserveAspectRatio: "none",
    "aria-hidden": "true",
  });
  svg.appendChild(svgEl("path", { d: wavePath(baseline, amplitude, period) }));
  return svg;
}

function lightRay() {
  const ray = document.createElement("div");
  ray.className = "sea-surface__ray";
  ray.style.left = `${randomBetween(-5, 95)}vw`;
  ray.style.width = `${randomBetween(5, 12)}vw`;
  ray.style.setProperty("--skew", `${randomBetween(-18, -6)}deg`);
  ray.style.animationDuration = `${randomBetween(8000, 14000)}ms`;
  ray.style.animationDelay = `-${randomBetween(0, 14000)}ms`;
  return ray;
}

function glints() {
  const svg = svgEl("svg", { class: "sea-surface__glints", "aria-hidden": "true" });
  for (let i = 0; i < GLINT_COUNT; i++) {
    const x = randomBetween(4, 90);
    const y = `${randomBetween(15, 85)}%`;
    const line = svgEl("line", { x1: `${x}%`, x2: `${x + randomBetween(2, 6)}%`, y1: y, y2: y });
    line.style.animationDuration = `${randomBetween(6000, 10000)}ms`;
    line.style.animationDelay = `-${randomBetween(0, 10000)}ms`;
    svg.appendChild(line);
  }
  return svg;
}

// Seen from below; y=0 in each viewBox is the waterline, and anything above it is masked
// to a faint glimpse through the surface. The viewBox must hold the whole drawing, since
// the mask hides what overflows. Every hull faces right and is mirrored by --flip.
// The [data-wake] part is where bubbles stream from.
const BOATS = [
  {
    kind: "motorboat",
    width: "10vw",
    crossingMs: { min: 16000, max: 22000 },
    viewBox: "-8 -20 128 56",
    bubble: { everyMs: 80, size: { min: 2, max: 6 } },
    parts: () => [
      svgEl("path", { d: "M6 -5 L108 -5 Q121 -4 118 3 Q100 13 74 16 L10 18 L6 15 Z" }),
      svgEl("path", { d: "M58 -5 L60 -9 L68 -9 L76 -16 L78 -16 L74 -9 L78 -5 Z" }),
      svgEl("circle", { cx: 50, cy: -14, r: 3 }),
      svgEl("path", { d: "M46 -5 L47 -10 Q50 -12 53 -10 L54 -5 Z" }),
      svgEl("path", { d: "M2 -5 L6 -5 L6 24 L2 24 Z M0 22 L8 22 L8 27 L4 30 L0 27 Z" }),
      svgEl("path", {
        class: "sea-surface__prop",
        "data-wake": "",
        d: "M-1 25 C-4 21 -4.5 18 -2.5 17 C-0.5 18 0 21 -1 25 C-4 29 -4.5 32 -2.5 33 C-0.5 32 0 29 -1 25 Z",
      }),
    ],
  },
  {
    kind: "sailboat",
    width: "13vw",
    crossingMs: { min: 30000, max: 40000 },
    viewBox: "0 -62 120 106",
    bubble: { everyMs: 420, size: { min: 2, max: 5 } },
    parts: () => [
      svgEl("path", { d: "M61 -4 L61 -60 L63 -60 L63 -4 Z M64 -6 L64 -56 L98 -6 Z M60 -6 L60 -48 L34 -6 Z" }),
      svgEl("path", { d: "M2 -4 L118 -4 L120 0 Q116 10 100 14 Q60 20 22 14 Q6 10 0 0 Z" }),
      svgEl("path", { d: "M56 15 L59 38 L70 38 L71 16 Z" }),
      svgEl("ellipse", { cx: 64, cy: 39, rx: 10, ry: 3.2 }),
      svgEl("path", { "data-wake": "", d: "M14 11 L12 27 L19 27 L23 13 Z" }),
    ],
  },
  {
    kind: "rowboat",
    width: "6vw",
    crossingMs: { min: 40000, max: 52000 },
    viewBox: "0 -26 80 54",
    bubble: { everyMs: 110, size: { min: 2, max: 5 }, while: bladeIsWet },
    parts: () => [
      svgEl("path", { d: "M1 -4 L79 -4 L80 0 Q76 10 62 13 L18 13 Q4 10 0 0 Z M10 10 L8 17 L17 13 Z" }),
      ...rowerParts(),
    ],
  },
];

const WAKE_BUBBLE_MS = 2600;

// Wake bubbles start at the surface, so they get pushed down and back before drifting up.
function releaseWakeBubble(surface, boat, spec, flip) {
  const source = boat.querySelector("[data-wake]").getBoundingClientRect();
  const origin = surface.getBoundingClientRect();
  const bubble = document.createElement("div");
  bubble.className = "sea-surface__bubble";
  const size = randomInRange(spec.size);
  bubble.style.width = bubble.style.height = `${size}px`;
  bubble.style.left = `${source.left + source.width / 2 - origin.left + randomBetween(-4, 4)}px`;
  bubble.style.top = `${source.top + source.height / 2 - origin.top + randomBetween(-3, 3)}px`;
  surface.appendChild(bubble);

  const back = -flip * randomBetween(30, 80);
  const down = randomBetween(12, 40);
  const drift = bubble.animate(
    [
      { transform: "translate(0, 0)", opacity: 0.55 },
      { transform: `translate(${back * 0.6}px, ${down}px)`, opacity: 0.45, offset: 0.35 },
      { transform: `translate(${back}px, ${down * 0.3}px)`, opacity: 0 },
    ],
    { duration: WAKE_BUBBLE_MS * randomBetween(0.8, 1.2), easing: "ease-out" }
  );
  animationDone(drift).then(() => bubble.remove());
}

function buildBoat(surface) {
  const spec = BOATS[Math.floor(Math.random() * BOATS.length)];
  const boat = document.createElement("div");
  boat.className = `sea-surface__boat sea-surface__boat--${spec.kind}`;
  const goesRight = Math.random() < 0.5;
  const flip = goesRight ? 1 : -1;
  boat.style.width = spec.width;
  boat.style.setProperty("--from-x", goesRight ? `calc(-1 * ${spec.width} - 4vw)` : "104vw");
  boat.style.setProperty("--to-x", goesRight ? "104vw" : `calc(-1 * ${spec.width} - 4vw)`);
  boat.style.setProperty("--flip", flip);
  const [, minY, viewWidth] = spec.viewBox.split(" ").map(Number);
  boat.style.setProperty("--waterline", `calc(${spec.width} * ${-minY / viewWidth})`);
  boat.style.animationDuration = `${randomInRange(spec.crossingMs)}ms`;
  boat.launchedAt = performance.now();

  const svg = svgEl("svg", { class: "sea-surface__hull", viewBox: spec.viewBox, "aria-hidden": "true" });
  svg.append(...spec.parts());
  boat.appendChild(svg);

  const wake = setInterval(() => {
    if (!boat.isConnected) return clearInterval(wake);
    if (spec.bubble.while && !spec.bubble.while(performance.now() - boat.launchedAt)) return;
    releaseWakeBubble(surface, boat, spec.bubble, flip);
  }, spec.bubble.everyMs);

  boat.addEventListener("animationend", (event) => {
    if (event.target !== boat) return;
    clearInterval(wake);
    boat.remove();
  });
  return boat;
}

function scheduleBoats(surface) {
  setTimeout(() => {
    if (!surface.isConnected) return;
    surface.appendChild(buildBoat(surface));
    scheduleBoats(surface);
  }, randomInRange(BOAT_DELAY_MS));
}

export function createSeaSurface(container) {
  const surface = document.createElement("div");
  surface.className = "sea-surface";

  const band = document.createElement("div");
  band.className = "sea-surface__band";
  band.append(
    waveLayer("sea-surface__waves--back", 62, 9, 400),
    waveLayer("sea-surface__waves--front", 48, 6, 320),
    glints()
  );

  surface.append(...Array.from({ length: RAY_COUNT }, lightRay), band);
  container.appendChild(surface);
  if (!prefersReducedMotion) scheduleBoats(surface);
  return surface;
}
