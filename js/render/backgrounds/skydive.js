// The mountain view's super-rare sight: a plane passes, a skydiver jumps, free-falls,
// opens a parachute and drifts down into the lake with a splash and spreading ripples.
// It plays on its own layer above the landscape so the landing sits on the water.
import { randomBetween, svgEl, animationDone } from "./util.js";
import { planeShape } from "./sky.js";

const PLANE_LENGTH_PX = 84;
const PLANE_CROSSING_MS = 26000;
const DIVER_WIDTH_PX = 42;
const FREEFALL_MS = 2600;
const CANOPY_OPEN_MS = 700;
const DESCENT_MS_PER_SCREEN = 20000;
const DESCENT_START_SCALE = 0.75;
const RIPPLE_MS = 2800;

function diverShape() {
  const svg = svgEl("svg", { class: "skydive__diver-shape", viewBox: "0 0 40 60", "aria-hidden": "true" });
  const canopy = svgEl("g", { class: "skydive__canopy" });
  canopy.append(
    svgEl("path", {
      class: "skydive__lines",
      d: "M3 14 L16 38.6 M11 12.6 L16.4 38.6 M37 14 L24 38.6 M29 12.6 L23.6 38.6",
    }),
    svgEl("path", {
      class: "skydive__canopy-cloth",
      d: "M2 14 Q20 -4 38 14 Q33 11 29 12.5 Q24.5 10.5 20 12 Q15.5 10.5 11 12.5 Q7 11 2 14 Z",
    }),
    svgEl("path", { class: "skydive__canopy-cells", d: "M11 12.5 Q12 6 14.5 3.2 M20 12 L20 2.4 M29 12.5 Q28 6 25.5 3.2" })
  );
  const figure = svgEl("g", { class: "skydive__figure" });
  figure.append(
    svgEl("path", { class: "skydive__leg skydive__leg--left", d: "M18.2 50.4 L17 58.4 Q17.9 59.2 18.9 58.6 L20 51 Z" }),
    svgEl("path", { class: "skydive__leg skydive__leg--right", d: "M20 51 L21.1 58.6 Q22.1 59.2 23 58.4 L21.8 50.4 Z" }),
    svgEl("path", { class: "skydive__suit", d: "M17.4 44.2 Q20 42.8 22.6 44.2 L22.1 51.2 Q20 52.2 17.9 51.2 Z" }),
    svgEl("path", {
      class: "skydive__suit",
      d: "M18 45.2 Q15.2 42.4 15.4 38.4 L16.8 38.4 Q17 41.6 19 44.2 Z M22 45.2 Q24.8 42.4 24.6 38.4 L23.2 38.4 Q23 41.6 21 44.2 Z",
    }),
    svgEl("circle", { class: "skydive__head", cx: 20, cy: 41.4, r: 2.5 })
  );
  const body = svgEl("g", { class: "skydive__body" });
  body.appendChild(figure);
  svg.append(canopy, body);
  return svg;
}

function at(x, y, scale = 1) {
  return { transform: `translate(${x}px, ${y}px) scale(${scale})` };
}

// Under canopy: a wind-blown S-curve that speeds up slightly and grows as the diver
// comes toward the viewer, so the approach to the water reads as getting closer.
function descentKeyframes(from, to, swing) {
  const steps = 8;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const fall = t ** 1.25;
    const x = from.x + (to.x - from.x) * t + swing * Math.sin(t * Math.PI * 2.5) * (1 - t);
    return at(x, from.y + (to.y - from.y) * fall, DESCENT_START_SCALE + (1 - DESCENT_START_SCALE) * t);
  });
}

function flyPlane(layer, { goesRight, y, length, duration }) {
  const plane = document.createElement("div");
  plane.className = "skydive__plane";
  plane.style.setProperty("--size", `${length}px`);
  plane.style.setProperty("--height", `${length * 0.3}px`);
  plane.style.setProperty("--flip", goesRight ? -1 : 1);
  const inner = document.createElement("div");
  inner.className = "sky-scene__plane-flip";
  const trail = document.createElement("div");
  trail.className = "sky-scene__trail";
  inner.append(trail, planeShape());
  plane.appendChild(inner);
  layer.appendChild(plane);

  const fromX = goesRight ? -length * 10 : window.innerWidth + length;
  const toX = goesRight ? window.innerWidth + length : -length * 10;
  const flight = plane.animate([at(fromX, y), at(toX, y)], { duration, easing: "linear" });
  return { fromX, toX, done: animationDone(flight).then(() => plane.remove()) };
}

function splash(layer, x, y, scale) {
  const effects = [];
  for (let i = 0; i < 7; i++) {
    const drop = document.createElement("div");
    drop.className = "skydive__drop";
    drop.style.left = `${x}px`;
    drop.style.top = `${y}px`;
    layer.appendChild(drop);
    const dx = randomBetween(-14, 14) * scale;
    const rise = randomBetween(10, 26) * scale;
    const arc = drop.animate(
      [
        { transform: "translate(0, 0)", opacity: 0.7 },
        { transform: `translate(${dx}px, -${rise}px)`, opacity: 0.6, offset: 0.45 },
        { transform: `translate(${dx * 1.7}px, 0)`, opacity: 0 },
      ],
      { duration: randomBetween(650, 900), easing: "ease-out" }
    );
    effects.push(animationDone(arc).then(() => drop.remove()));
  }
  for (let i = 0; i < 3; i++) {
    const ripple = document.createElement("div");
    ripple.className = "skydive__ripple";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = `${64 * scale}px`;
    ripple.style.height = `${11 * scale}px`;
    layer.appendChild(ripple);
    const spread = ripple.animate(
      [
        { transform: "translate(-50%, -50%) scale(0.15)", opacity: 0.6 },
        { transform: "translate(-50%, -50%) scale(1.6)", opacity: 0 },
      ],
      { duration: RIPPLE_MS, delay: i * 380, easing: "ease-out", fill: "backwards" }
    );
    effects.push(animationDone(spread).then(() => ripple.remove()));
  }
  return Promise.all(effects);
}

// `lake` is the water's top and bottom edge on screen, in px.
export async function launchSkydive(container, { scale = 1, speedMultiplier = 1, lake }) {
  const layer = document.createElement("div");
  layer.className = "sky-scene skydive";
  container.appendChild(layer);

  const goesRight = Math.random() < 0.5;
  const planeY = window.innerHeight * randomBetween(0.08, 0.16);
  const planeLength = PLANE_LENGTH_PX * scale;
  const crossing = PLANE_CROSSING_MS / speedMultiplier;
  const plane = flyPlane(layer, { goesRight, y: planeY, length: planeLength, duration: crossing });

  const jumpX = window.innerWidth * randomBetween(0.3, 0.6);
  const jumpDelay = (crossing * (jumpX - plane.fromX)) / (plane.toX - plane.fromX);
  await new Promise((resolve) => setTimeout(resolve, jumpDelay));
  if (!layer.isConnected) return;

  const width = DIVER_WIDTH_PX * scale;
  const height = width * 1.5;
  const diver = document.createElement("div");
  diver.className = "skydive__diver";
  diver.style.width = `${width}px`;
  diver.style.height = `${height}px`;
  const sway = document.createElement("div");
  sway.className = "skydive__sway";
  sway.appendChild(diverShape());
  diver.appendChild(sway);
  layer.appendChild(diver);

  const heading = goesRight ? 1 : -1;
  const start = { x: jumpX - width / 2, y: planeY - height * 0.7 };
  const opened = {
    x: start.x + heading * window.innerWidth * 0.03,
    y: start.y + window.innerHeight * 0.13,
  };
  await animationDone(
    diver.animate([at(start.x, start.y, DESCENT_START_SCALE), at(opened.x, opened.y, DESCENT_START_SCALE)], {
      duration: FREEFALL_MS / Math.sqrt(speedMultiplier),
      easing: "cubic-bezier(0.45, 0, 0.9, 0.6)",
      fill: "forwards",
    })
  );

  diver.classList.add("skydive__diver--open");
  const landing = {
    x: opened.x + window.innerWidth * randomBetween(0.02, 0.08),
    y: lake.top + (lake.bottom - lake.top) * randomBetween(0.2, 0.55) - height,
  };
  const descentMs = (DESCENT_MS_PER_SCREEN * ((landing.y - opened.y) / window.innerHeight)) / speedMultiplier;
  await animationDone(
    diver.animate(descentKeyframes(opened, landing, width * randomBetween(1.2, 2)), {
      duration: CANOPY_OPEN_MS + descentMs,
      easing: "linear",
      fill: "forwards",
    })
  );

  diver.classList.add("skydive__diver--landed");
  await Promise.all([
    splash(layer, landing.x + width / 2, landing.y + height, scale),
    new Promise((resolve) => setTimeout(resolve, 1600)),
    plane.done,
  ]);
  layer.remove();
}
