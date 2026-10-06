import { svgEl, randomBetween, prefersReducedMotion } from "./util.js";

const TILE = 1600; // wave paths repeat every TILE units, so a -50% scroll loops seamlessly
const RAY_COUNT = 5;
const GLINT_COUNT = 6;
const BOAT_DELAY_MS = [40000, 90000];
const BOAT_CROSSING_MS = [26000, 36000];

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

// Seen from below: a dark hull just under the waterline, with keel and rudder.
function buildBoat() {
  const boat = document.createElement("div");
  boat.className = "sea-surface__boat";
  const goesRight = Math.random() < 0.5;
  boat.style.setProperty("--from-x", goesRight ? "-16vw" : "104vw");
  boat.style.setProperty("--to-x", goesRight ? "104vw" : "-16vw");
  boat.style.setProperty("--flip", goesRight ? "1" : "-1");
  boat.style.animationDuration = `${randomBetween(...BOAT_CROSSING_MS)}ms`;

  const svg = svgEl("svg", { class: "sea-surface__hull", viewBox: "0 0 120 44", "aria-hidden": "true" });
  svg.append(
    svgEl("path", { d: "M0 2 L120 2 Q112 18 92 22 L22 22 Q8 18 0 2 Z" }),
    svgEl("path", { d: "M52 21 L58 40 L70 40 L72 21 Z" }),
    svgEl("path", { d: "M14 18 L10 30 L18 30 L22 20 Z" })
  );
  boat.appendChild(svg);
  boat.addEventListener("animationend", (event) => {
    if (event.target === boat) boat.remove();
  });
  return boat;
}

function scheduleBoats(surface) {
  setTimeout(() => {
    if (!surface.isConnected) return;
    surface.appendChild(buildBoat());
    scheduleBoats(surface);
  }, randomBetween(...BOAT_DELAY_MS));
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
