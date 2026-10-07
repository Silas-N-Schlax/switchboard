import {
  mountainsDefaultSize,
  skyCloudBaseWidthRange,
  skyCloudBaseDurationRange,
  skyBirdBaseSizeRange,
  skyBirdBaseDurationRange,
  skyPlaneBaseSizeRange,
  skyPlaneBaseDurationRange,
  skyBalloonBaseSizeRange,
  skyBalloonBaseDurationRange,
  skyBalloonChance,
  skyCountRatios,
} from "../../../defaults.js";
import { randomBetween, createSpawnField, svgEl } from "./util.js";
import { pickBird } from "./birdSpecies.js";

const SOLO = [[0, 0]];
const BIRD_VIEWBOX = [40, 16];

function sizeScale(sizeMultiplier) {
  return sizeMultiplier / mountainsDefaultSize;
}

function spawnCount(count, ratio) {
  return Math.max(1, Math.round(count * ratio));
}

function placeStaticAt(el, band) {
  el.style.animation = "none";
  el.style.transform = `translate(${randomBetween(5, 90)}vw, ${randomBetween(band.top, band.bottom)}vh)`;
}

const STREAK_CHANCE = 0.75;

// A long tapered wisp: an arched top edge over a flatter underside, pointed at both ends.
// Some get a thinner second strand trailing beneath.
function streakPaths() {
  const strand = (y, thickness, from, to) => {
    const crestX = from + (to - from) * randomBetween(0.35, 0.65);
    const crestY = y - thickness * randomBetween(0.8, 1.2);
    const tipY = y + randomBetween(-1.5, 1.5);
    return (
      `M${from} ${y} C${from + 30} ${y - thickness * 0.4} ${crestX - 40} ${crestY} ${crestX} ${crestY} ` +
      `C${crestX + 40} ${crestY} ${to - 30} ${tipY - thickness * 0.3} ${to} ${tipY} ` +
      `C${to - 40} ${tipY + thickness * 0.4} ${from + 50} ${y + thickness * 0.5} ${from} ${y} Z`
    );
  };
  const paths = [strand(18, randomBetween(6, 10), 0, 200)];
  if (Math.random() < 0.4) {
    const from = randomBetween(20, 60);
    paths.push(strand(25, randomBetween(2.5, 4), from, from + randomBetween(90, 130)));
  }
  return { viewBox: [200, 30], widthScale: 1.6, paths };
}

// One broad dome with low shoulders either side, over a softly rounded flat base.
function cumulusPaths() {
  const crestX = randomBetween(42, 58);
  const crestY = randomBetween(4, 9);
  const leftShoulder = randomBetween(20, 25);
  const rightShoulder = randomBetween(18, 24);
  return {
    viewBox: [100, 36],
    widthScale: 1,
    paths: [
      `M6 32 C4 ${leftShoulder + 2} 12 ${leftShoulder - 2} 22 ${leftShoulder} ` +
        `C${crestX - 22} ${crestY + 4} ${crestX - 10} ${crestY} ${crestX} ${crestY} ` +
        `C${crestX + 14} ${crestY} ${crestX + 22} ${rightShoulder - 8} 80 ${rightShoulder} ` +
        `C90 ${rightShoulder - 1} 97 26 94 32 C93 34.5 90 35 86 35 L12 35 C8 35 6 34 6 32 Z`,
    ],
  };
}

function cloudShape() {
  const { viewBox, widthScale, paths } = Math.random() < STREAK_CHANCE ? streakPaths() : cumulusPaths();
  const svg = svgEl("svg", {
    class: "sky-scene__cloud-shape",
    viewBox: `0 0 ${viewBox[0]} ${viewBox[1]}`,
    "aria-hidden": "true",
  });
  svg.append(...paths.map((d) => svgEl("path", { d })));
  return { svg, widthScale, aspect: viewBox[1] / viewBox[0] };
}

function randomizeCloud(el, { scale, speedMultiplier, band }) {
  const depth = Math.random();
  // Clouds respond to the size slider more gently than birds and planes.
  const { svg, widthScale, aspect } = cloudShape();
  const width =
    randomBetween(...skyCloudBaseWidthRange) * widthScale * (0.5 + scale / 2) * (0.5 + 0.5 * depth);
  const duration = (randomBetween(...skyCloudBaseDurationRange) * (1.6 - 0.6 * depth)) / speedMultiplier;
  el.style.zIndex = String(Math.round(depth * 10));
  el.style.setProperty("--size", `${width}px`);
  el.style.setProperty("--height", `${width * aspect}px`);
  el.style.setProperty("--depth-opacity", `${0.35 + 0.65 * depth}`);
  el.style.setProperty("--from-x", `calc(-${width}px - 2vw)`);
  el.style.setProperty("--to-x", "102vw");
  el.style.setProperty("--y", `${randomBetween(band.top, band.bottom)}vh`);
  el.style.setProperty("--drift-y", `${randomBetween(-2, 2)}vh`);
  el.style.setProperty("--duration", `${duration}ms`);
  el.replaceChildren(svg);
  return randomBetween(0, duration);
}

function buildBird(species, { offset, width, flip, speedMultiplier }) {
  const [vbWidth, vbHeight] = BIRD_VIEWBOX;
  const member = document.createElement("div");
  member.className = "sky-scene__bird-member";
  member.style.left = `${offset[0] * width * flip}px`;
  member.style.top = `${offset[1] * width}px`;
  member.style.setProperty("--wave", `${species.wave * randomBetween(0.6, 1.2)}vh`);
  member.style.setProperty("--wave-duration", `${randomBetween(2400, 4200) / Math.sqrt(speedMultiplier)}ms`);
  member.style.animationDelay = `-${randomBetween(0, 4000)}ms`;

  const svg = svgEl("svg", {
    class: `sky-scene__bird-shape${species.glide ? " sky-scene__bird-shape--glide" : ""}`,
    viewBox: `0 0 ${vbWidth} ${vbHeight}`,
    "aria-hidden": "true",
  });
  svg.style.setProperty("--flip", flip);
  if (species.flapMs) {
    svg.style.setProperty("--flap-duration", `${(species.flapMs * randomBetween(0.85, 1.15)) / Math.sqrt(speedMultiplier)}ms`);
  }
  const flapDelay = `-${randomBetween(0, 1000)}ms`;
  for (const [side, d] of [["left", species.leftWing], ["right", species.rightWing]]) {
    const wing = svgEl("path", { class: `sky-scene__wing sky-scene__wing--${side}`, d });
    wing.style.animationDelay = flapDelay;
    svg.appendChild(wing);
  }
  svg.appendChild(svgEl("path", { class: "sky-scene__bird-body", d: species.body }));
  member.appendChild(svg);
  return member;
}

function randomizeBird(el, { scale, speedMultiplier, band }) {
  const species = pickBird();
  const depth = Math.random();
  const goesRight = Math.random() < 0.5;
  const flip = goesRight ? -1 : 1;
  const width = randomBetween(...skyBirdBaseSizeRange) * scale * species.size * (0.55 + 0.45 * depth);
  const duration =
    (randomBetween(...skyBirdBaseDurationRange) * species.pace * (1.3 - 0.3 * depth)) / speedMultiplier;
  const flock = species.flock ?? SOLO;
  const trail = Math.max(...flock.map(([x]) => x)) * width;
  // A random run-up offscreen spaces arrivals out instead of a steady stream.
  const runUp = randomBetween(2, 40);

  el.className = `sky-scene__bird sky-scene__bird--${species.id}`;
  el.style.zIndex = String(Math.round(depth * 10));
  el.style.setProperty("--size", `${width}px`);
  el.style.setProperty("--height", `${width * (BIRD_VIEWBOX[1] / BIRD_VIEWBOX[0])}px`);
  el.style.setProperty("--depth-opacity", `${0.4 + 0.6 * depth}`);
  el.style.setProperty("--from-x", goesRight ? `calc(-${width}px - ${runUp}vw)` : `${100 + runUp}vw`);
  el.style.setProperty("--to-x", goesRight ? `calc(102vw + ${trail}px)` : `calc(-${width + trail}px - 2vw)`);
  el.style.setProperty("--y", `${randomBetween(band.top, band.bottom)}vh`);
  el.style.setProperty("--drift-y", `${randomBetween(-8, 8)}vh`);
  el.style.setProperty("--duration", `${duration * (1 + runUp / 100)}ms`);
  el.replaceChildren(...flock.map((offset) => buildBird(species, { offset, width, flip, speedMultiplier })));
  return randomBetween(0, duration);
}

export function planeShape() {
  const svg = svgEl("svg", { class: "sky-scene__plane-shape", viewBox: "0 0 40 12", "aria-hidden": "true" });
  svg.append(
    svgEl("path", {
      class: "sky-scene__plane-body",
      d: "M1 6.4 Q2 5 6 4.8 L33 5 L37 1 L39.5 1 L38 5.4 L39.5 7.2 L33 7.4 L6 7.6 Q2 7.6 1 6.4 Z M15 6.6 L25 6.6 L21 10.6 L18.4 10.6 Z",
    }),
    svgEl("circle", { class: "sky-scene__plane-light", cx: 20, cy: 9.6, r: 1 })
  );
  return svg;
}

function randomizePlane(el, { scale, speedMultiplier, band }) {
  const depth = Math.random();
  const goesRight = Math.random() < 0.5;
  const width = randomBetween(...skyPlaneBaseSizeRange) * scale * (0.6 + 0.4 * depth);
  const crossing = randomBetween(...skyPlaneBaseDurationRange) / speedMultiplier;
  el.style.zIndex = String(Math.round(depth * 10));
  el.style.setProperty("--size", `${width}px`);
  el.style.setProperty("--height", `${width * 0.3}px`);
  el.style.setProperty("--flip", goesRight ? -1 : 1);
  el.style.setProperty("--depth-opacity", `${0.5 + 0.5 * depth}`);
  el.style.setProperty("--from-x", goesRight ? `calc(-${width}px - 20vw)` : "102vw");
  el.style.setProperty("--to-x", goesRight ? "102vw" : `calc(-${width}px - 20vw)`);
  el.style.setProperty("--y", `${randomBetween(band.top, band.bottom)}vh`);
  el.style.setProperty("--drift-y", `${randomBetween(-4, 4)}vh`);
  // planeFly crosses in the first 60% of the cycle and waits offscreen for the rest.
  const cycle = crossing / 0.6;
  el.style.setProperty("--duration", `${cycle}ms`);
  return randomBetween(0, cycle);
}

function balloonShape() {
  const svg = svgEl("svg", { class: "sky-scene__balloon-shape", viewBox: "0 0 40 60", "aria-hidden": "true" });
  svg.append(
    svgEl("path", {
      class: "sky-scene__balloon-envelope",
      d: "M20 2 C31 2 38 10 38 20 C38 31 29 37 25 42 L15 42 C11 37 2 31 2 20 C2 10 9 2 20 2 Z",
    }),
    svgEl("path", {
      class: "sky-scene__balloon-gores",
      d: "M20 2 C13 10 12 30 17 42 M20 2 C27 10 28 30 23 42 M20 2 L20 42",
    }),
    svgEl("path", { class: "sky-scene__balloon-ropes", d: "M15.5 42 L17 50 M24.5 42 L23 50" }),
    svgEl("ellipse", { class: "sky-scene__balloon-flame", cx: 20, cy: 46, rx: 1.6, ry: 2.6 }),
    svgEl("rect", { class: "sky-scene__balloon-basket", x: 16.5, y: 50, width: 7, height: 6, rx: 1 })
  );
  return svg;
}

// Most crossings run empty; the balloon only shows when its `chance` roll comes up.
function randomizeBalloon(el, { scale, speedMultiplier, band, chance }) {
  const depth = Math.random();
  const height = randomBetween(...skyBalloonBaseSizeRange) * scale * (0.6 + 0.4 * depth);
  const width = height * (40 / 60);
  const duration = (randomBetween(...skyBalloonBaseDurationRange) * (1.3 - 0.3 * depth)) / speedMultiplier;
  el.style.visibility = Math.random() < chance ? "visible" : "hidden";
  el.style.zIndex = String(Math.round(depth * 10));
  el.style.setProperty("--size", `${width}px`);
  el.style.setProperty("--height", `${height}px`);
  el.style.setProperty("--depth-opacity", `${0.5 + 0.5 * depth}`);
  el.style.setProperty("--from-x", `calc(-${width}px - 2vw)`);
  el.style.setProperty("--to-x", "102vw");
  el.style.setProperty("--y", `${randomBetween(band.top, band.bottom)}vh`);
  el.style.setProperty("--drift-y", `${randomBetween(-6, 6)}vh`);
  el.style.setProperty("--duration", `${duration}ms`);
  el.style.setProperty("--flame-delay", `-${randomBetween(0, 7000)}ms`);
  return randomBetween(0, duration);
}

// The sky band is in vh; `horizonVh` is where the landscape begins.
export function createSky(
  container,
  { count, sizeMultiplier, speedMultiplier, horizonVh, balloonFrequency = 1, birds, planes }
) {
  const scale = sizeScale(sizeMultiplier);
  const options = { scale, speedMultiplier };
  const cloudBand = { top: 2, bottom: horizonVh * 0.7 };
  const expectedBalloons = skyBalloonChance * balloonFrequency;
  const balloonSlots = Math.ceil(expectedBalloons);
  const balloonChance = expectedBalloons / balloonSlots;
  const sky = document.createElement("div");
  sky.className = "sky-scene";
  container.appendChild(sky);

  createSpawnField(sky, {
    className: "sky-scene__clouds",
    count: spawnCount(count, skyCountRatios.clouds),
    createItem() {
      const cloud = document.createElement("div");
      cloud.className = "sky-scene__cloud";
      return cloud;
    },
    randomize: (el) => randomizeCloud(el, { ...options, band: cloudBand }),
    placeStatic: (el) => placeStaticAt(el, cloudBand),
  });

  createSpawnField(sky, {
    className: "sky-scene__balloons",
    count: balloonSlots,
    createItem() {
      const balloon = document.createElement("div");
      balloon.className = "sky-scene__balloon";
      const sway = document.createElement("div");
      sway.className = "sky-scene__balloon-sway";
      sway.appendChild(balloonShape());
      balloon.appendChild(sway);
      return balloon;
    },
    randomize: (el) =>
      randomizeBalloon(el, { ...options, band: { top: 8, bottom: horizonVh * 0.6 }, chance: balloonChance }),
    placeStatic(el) {
      el.hidden = true;
    },
  });

  if (planes) {
    createSpawnField(sky, {
      className: "sky-scene__planes",
      count: spawnCount(count, skyCountRatios.planes),
      createItem() {
        const plane = document.createElement("div");
        plane.className = "sky-scene__plane";
        const inner = document.createElement("div");
        inner.className = "sky-scene__plane-flip";
        const trail = document.createElement("div");
        trail.className = "sky-scene__trail";
        inner.append(trail, planeShape());
        plane.appendChild(inner);
        return plane;
      },
      randomize: (el) => randomizePlane(el, { ...options, band: { top: 5, bottom: horizonVh * 0.45 } }),
      placeStatic(el) {
        el.hidden = true;
      },
    });
  }

  if (birds) {
    const band = { top: 8, bottom: horizonVh - 4 };
    createSpawnField(sky, {
      className: "sky-scene__birds",
      count: spawnCount(count, skyCountRatios.birds),
      createItem: () => document.createElement("div"),
      randomize: (el) => randomizeBird(el, { ...options, band }),
      placeStatic: (el) => placeStaticAt(el, band),
    });
  }
  return sky;
}
