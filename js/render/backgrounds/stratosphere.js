import {
  stratosphereDefaultSize,
  satelliteBaseSizeRange,
  satelliteBaseDurationRange,
  starCount,
  shootingStarMeanIntervalMs,
  issMeanIntervalMs,
} from "../../../defaults.js";
import {
  svgEl,
  seededRandom,
  randomBetween,
  randomInRange,
  createSpawnField,
  scheduleRareEvent,
  animationDone,
} from "./util.js";
import { pickSatellite } from "./satelliteModels.js";
import { planetTypes, buildPlanet, WIDTH, HEIGHT, LIMB_TOP_Y, PLANET_RADIUS, arcBowPx } from "./planet.js";
import { launchIss } from "./iss.js";
import { launchAlien } from "./alien.js";

const STAR_SEED = 20261009;
// Matches .stratosphere-scene__world's height, the same band as the mountain scene.
const BAND_ASPECT = HEIGHT / WIDTH;
const BAND_MIN_VH = 28;

function bandHeightPx() {
  return Math.max(window.innerWidth * BAND_ASPECT, (window.innerHeight * BAND_MIN_VH) / 100);
}

function planetRadiusPx() {
  return (PLANET_RADIUS * bandHeightPx()) / HEIGHT;
}

function limbTopVh() {
  const limbPx = bandHeightPx() * (1 - LIMB_TOP_Y / HEIGHT);
  return 100 - (limbPx / window.innerHeight) * 100;
}

function buildStars() {
  const random = seededRandom(STAR_SEED);
  const field = document.createElement("div");
  field.className = "stratosphere-scene__stars";
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement("div");
    star.className = "stratosphere-scene__star";
    // Cubed so most stars are pinpricks and only a few are bright.
    const size = 0.8 + random() ** 3 * 2;
    star.style.left = `${random() * 100}%`;
    star.style.top = `${random() * 100}%`;
    star.style.width = star.style.height = `${size}px`;
    star.style.setProperty("--star-opacity", `${0.25 + random() * 0.6}`);
    star.style.setProperty("--twinkle-duration", `${3000 + random() * 5000}ms`);
    star.style.animationDelay = `-${random() * 8000}ms`;
    field.appendChild(star);
  }
  return field;
}

const SOLO = [[0, 0]];

function satelliteShape(model, flip) {
  const [width, height] = model.viewBox;
  const svg = svgEl("svg", {
    class: "stratosphere-scene__satellite-shape",
    viewBox: `0 0 ${width} ${height}`,
    "aria-hidden": "true",
  });
  svg.style.setProperty("--flip", flip);
  svg.append(...model.parts.map(([tone, d]) => svgEl("path", { class: `stratosphere-scene__part--${tone}`, d })));
  if (model.light) {
    const [cx, cy] = model.light;
    svg.appendChild(svgEl("circle", { class: "stratosphere-scene__satellite-light", cx, cy, r: 0.9 }));
  }
  return svg;
}

function buildMember(model, { offset, width, height, flip }) {
  const member = document.createElement("div");
  member.className = "stratosphere-scene__satellite-member";
  member.style.left = `${offset[0] * width * flip}px`;
  member.style.top = `${offset[1] * height}px`;
  const tumble = document.createElement("div");
  tumble.className = `stratosphere-scene__satellite-tumble${model.steady ? " stratosphere-scene__satellite-tumble--steady" : ""}`;
  tumble.style.animationDelay = `-${randomBetween(0, 18000)}ms`;
  tumble.appendChild(satelliteShape(model, flip));
  member.appendChild(tumble);
  return member;
}

function randomizeSatellite(el, { scale, speedMultiplier, band, orbitRadius }) {
  const model = pickSatellite();
  const depth = Math.random();
  const goesRight = Math.random() < 0.5;
  const flip = goesRight ? -1 : 1;
  const [vbWidth, vbHeight] = model.viewBox;
  const width = randomInRange(satelliteBaseSizeRange) * scale * model.size * (0.5 + 0.5 * depth);
  const height = width * (vbHeight / vbWidth);
  const duration = (randomInRange(satelliteBaseDurationRange) * (1.4 - 0.4 * depth)) / speedMultiplier;
  const train = model.train ?? SOLO;
  const trail = Math.max(...train.map(([x]) => x)) * width;
  // A random run-up offscreen spaces arrivals out instead of a steady stream.
  const runUp = randomBetween(2, 40);
  const runUpPx = (runUp / 100) * window.innerWidth;
  const bow = arcBowPx((window.innerWidth + 2 * runUpPx + width + trail) / 2, orbitRadius);
  const y = randomBetween(band.top, band.bottom);
  el.className = `stratosphere-scene__satellite stratosphere-scene__satellite--${model.id}`;
  el.style.zIndex = String(Math.round(depth * 10));
  el.style.setProperty("--size", `${width}px`);
  el.style.setProperty("--height", `${height}px`);
  el.style.setProperty("--depth-opacity", `${0.35 + 0.65 * depth}`);
  el.style.setProperty("--from-x", goesRight ? `calc(-${width}px - ${runUp}vw)` : `${100 + runUp}vw`);
  el.style.setProperty("--to-x", goesRight ? `calc(${100 + runUp}vw + ${trail}px)` : `calc(-${width + trail}px - ${runUp}vw)`);
  el.style.setProperty("--bow", `${bow}px`);
  el.style.setProperty("--y", `${y}vh`);
  el.style.setProperty("--drift-y", `${Math.min(band.bottom - y, Math.max(band.top - y, randomBetween(-12, 12)))}vh`);
  el.style.setProperty("--tilt", model.steady ? "0deg" : `${randomBetween(-25, 25)}deg`);
  el.style.setProperty("--blink-delay", `-${randomBetween(0, 2000)}ms`);
  el.style.setProperty("--flare-delay", `-${randomBetween(0, 24000)}ms`);
  const cycle = duration * (1 + (2 * runUp) / 100);
  el.style.setProperty("--duration", `${cycle}ms`);
  const arc = document.createElement("div");
  arc.className = "stratosphere-scene__satellite-arc";
  arc.append(...train.map((offset) => buildMember(model, { offset, width, height, flip })));
  el.replaceChildren(arc);
  return randomBetween(0, cycle);
}

function launchShootingStar(layer, band) {
  const goesRight = Math.random() < 0.5;
  const dip = randomBetween(12, 32);
  const angle = goesRight ? dip : 180 - dip;
  const travel = randomBetween(180, 360);
  const x = (randomBetween(10, 90) / 100) * window.innerWidth;
  const y = (randomBetween(band.top, band.top + (band.bottom - band.top) * 0.6) / 100) * window.innerHeight;

  const star = document.createElement("div");
  star.className = "stratosphere-scene__shooting-star";
  star.style.width = `${randomBetween(80, 160)}px`;
  layer.appendChild(star);

  const at = (distance) => `translate(${x}px, ${y}px) rotate(${angle}deg) translateX(${distance}px)`;
  const streak = star.animate(
    [{ transform: at(0), opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: at(travel), opacity: 0 }],
    { duration: randomBetween(700, 1100), easing: "ease-in" }
  );
  return animationDone(streak).then(() => star.remove());
}

export const stratosphere = {
  id: "stratosphere",
  label: "Stratosphere",
  controls: ["count", "size", "speed"],
  frequencySliders: [{ key: "issFrequency", label: "Rare sightings" }],
  selects: [
    {
      key: "planet",
      label: "Planet",
      options: [...planetTypes.map(({ id, label }) => ({ value: id, label })), { value: "none", label: "None" }],
    },
  ],
  toggles: [{ key: "shootingStars", label: "Shooting stars" }],
  create(container, { count, sizeMultiplier, speedMultiplier, settings = {} }) {
    const scale = sizeMultiplier / stratosphereDefaultSize;
    // Open space above the planet, in vh.
    const planetOn = settings.planet !== "none";
    const band = { top: 4, bottom: planetOn ? limbTopVh() - 4 : 92 };
    const orbitRadius = planetOn ? planetRadiusPx() : Infinity;

    const scene = document.createElement("div");
    scene.className = "stratosphere-scene";
    const space = document.createElement("div");
    space.className = "stratosphere-scene__space";
    scene.append(space, buildStars());
    if (planetOn) scene.appendChild(buildPlanet(settings.planet, speedMultiplier));
    container.appendChild(scene);

    createSpawnField(scene, {
      className: "stratosphere-scene__satellites",
      count,
      createItem: () => document.createElement("div"),
      randomize: (el) => randomizeSatellite(el, { scale, speedMultiplier, band, orbitRadius }),
      placeStatic(el) {
        el.style.animation = "none";
        el.style.transform = `translate(${randomBetween(5, 90)}vw, ${randomBetween(band.top, band.bottom)}vh)`;
      },
    });

    const events = document.createElement("div");
    events.className = "stratosphere-scene__events";
    scene.appendChild(events);

    if (settings.shootingStars) {
      scheduleRareEvent(scene, {
        meanIntervalMs: shootingStarMeanIntervalMs,
        play: () => launchShootingStar(events, band),
      });
    }
    const eventScale = Math.min(1.6, Math.max(0.6, scale));
    scheduleRareEvent(scene, {
      frequency: settings.issFrequency,
      meanIntervalMs: issMeanIntervalMs,
      play: () => launchIss(events, { band, scale: eventScale, speedMultiplier, orbitRadius }),
    });
    scheduleRareEvent(scene, {
      frequency: settings.issFrequency,
      play: () => launchAlien(events, { band, scale: eventScale, speedMultiplier }),
    });
    return scene;
  },
};
