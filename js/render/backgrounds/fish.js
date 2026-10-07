import {
  fishBaseSizeRange,
  fishBaseDurationRange,
  fishDefaultSize as defaultFishSize,
  fishSizeScaleMax,
} from "../../../defaults.js";
import { randomBetween, createSpawnField, svgEl, prefersReducedMotion, scheduleRareEvent } from "./util.js";
import { pickSpecies } from "./fishSpecies.js";
import { startSharkHunt } from "./sharkHunt.js";
import { launchSubmarine } from "./submarine.js";
import { createSeaFloor } from "./seaFloor.js";
import { createSeaSurface } from "./seaSurface.js";

const SOLO = [[0, 0]];

function buildSilhouette(species, flip) {
  const [width, height] = species.viewBox;
  const svg = svgEl("svg", {
    class: "fish-field__body",
    viewBox: `0 0 ${width} ${height}`,
    "aria-hidden": "true",
  });
  svg.style.setProperty("--flip", flip);

  const fins = species.fins.map(({ d, origin }) => {
    const fin = svgEl("path", { class: "fish-field__fin", d });
    fin.style.transformOrigin = `${origin[0]}px ${origin[1]}px`;
    fin.style.animationDelay = `-${randomBetween(0, 2000)}ms`;
    return fin;
  });

  const tailClass = species.tail.flowing ? "fish-field__tail fish-field__tail--flowing" : "fish-field__tail";
  const tail = svgEl("path", { class: tailClass, d: species.tail.d });
  tail.style.transformOrigin = `${species.tail.origin[0]}px ${species.tail.origin[1]}px`;
  tail.style.animationDelay = `-${randomBetween(0, species.wagMs)}ms`;

  const body = svgEl("path", { class: "fish-field__shape", d: species.body });
  const markings = species.eye
    ? [svgEl("circle", { class: "fish-field__eye", cx: species.eye[0], cy: species.eye[1], r: species.eye[2] })]
    : [];
  const details = (species.details ?? []).map(({ d, tone }) =>
    svgEl("path", { class: `fish-field__detail fish-field__detail--${tone}`, d })
  );

  svg.append(...fins, tail, body, ...markings, ...details);
  return svg;
}

// member (bob up/down) > tilt (pitch with the wave) > svg (faces travel direction)
function buildMember(species, { offset, width, height, flip, speedMultiplier }) {
  const member = document.createElement("div");
  member.className = "fish-field__member";
  member.style.left = `${offset[0] * width * flip}px`;
  member.style.top = `${offset[1] * height}px`;

  const bobMs = randomBetween(2600, 4600);
  const bobDelayMs = randomBetween(0, bobMs * 2);
  member.style.setProperty("--bob-duration", `${bobMs}ms`);
  member.style.setProperty("--wave", `${randomBetween(0.4, 1.4)}vh`);
  member.style.setProperty("--pitch", `${randomBetween(3, 7) * -flip}deg`);
  member.style.setProperty("--wag-duration", `${(species.wagMs * randomBetween(0.85, 1.15)) / Math.sqrt(speedMultiplier)}ms`);
  member.style.animationDelay = `-${bobDelayMs}ms`;

  const tilt = document.createElement("div");
  tilt.className = "fish-field__tilt";
  // Quarter-cycle behind the bob, so the nose dips as the fish descends.
  tilt.style.animationDelay = `-${bobDelayMs + bobMs / 2}ms`;

  tilt.appendChild(buildSilhouette(species, flip));
  member.appendChild(tilt);
  return member;
}

// The default slider position draws fish at their base size; the rest of the slider's
// range above it grows them up to fishSizeScaleMax.
function fishScale(sizeMultiplier) {
  return 1 + ((sizeMultiplier - defaultFishSize) * (fishSizeScaleMax - 1)) / (1 - defaultFishSize);
}

function randomizeFish(el, sizeMultiplier, speedMultiplier, band, sharkFrequency) {
  const species = pickSpecies(sharkFrequency);
  const depth = Math.random();
  const swimsRight = Math.random() < 0.5;
  const flip = swimsRight ? -1 : 1;

  const [vbWidth, vbHeight] = species.viewBox;
  const width = randomBetween(...fishBaseSizeRange) * fishScale(sizeMultiplier) * species.size * (0.6 + 0.4 * depth);
  const height = width * (vbHeight / vbWidth);
  const duration =
    (randomBetween(...fishBaseDurationRange) * species.pace * (1.3 - 0.3 * depth)) / speedMultiplier;

  const school = species.school ?? SOLO;
  const trail = Math.max(...school.map(([x]) => x)) * width;

  el.className = `fish-field__fish fish-field__fish--${species.id}`;
  el.dataset.flip = String(flip);
  el.style.zIndex = String(Math.round(depth * 10));
  el.style.setProperty("--size", `${width}px`);
  el.style.setProperty("--height", `${height}px`);
  el.style.setProperty("--depth-opacity", `${0.5 + 0.5 * depth}`);
  el.style.setProperty("--swim-easing", species.swimEasing);
  el.style.setProperty("--from-x", swimsRight ? `calc(-${width}px - 2vw)` : "102vw");
  el.style.setProperty("--to-x", swimsRight ? `calc(102vw + ${trail}px)` : `calc(-${width + trail}px - 2vw)`);
  const top = band.top * 100;
  const bottom = band.bottom * 100;
  const y = randomBetween(top, bottom);
  el.style.setProperty("--y", `${y}vh`);
  el.style.setProperty("--drift-y", `${Math.min(bottom - y, Math.max(top - y, randomBetween(-10, 10)))}vh`);
  el.style.setProperty("--duration", `${duration}ms`);

  // The hunt nudges this layer (shark steering, prey darting) on top of the CSS swim.
  const steer = document.createElement("div");
  steer.className = "fish-field__steer";
  steer.append(
    ...school.map((offset) => buildMember(species, { offset, width, height, flip, speedMultiplier }))
  );
  el.replaceChildren(steer);
  return randomBetween(0, duration);
}

export const fish = {
  id: "fish",
  label: "Fish",
  controls: ["count", "size", "speed"],
  sliders: [{ key: "sharkFrequency", label: "Shark frequency" }],
  toggles: [
    { key: "sharkEats", label: "Sharks eat fish" },
    { key: "seaFloor", label: "Sea floor" },
    { key: "seaSurface", label: "Surface" },
  ],
  create(container, { count, sizeMultiplier, speedMultiplier, settings = {} }) {
    const floorOn = settings.seaFloor;
    const surfaceOn = settings.seaSurface;
    // Open water between the layers, as viewport-height fractions.
    const band = { top: surfaceOn ? 0.14 : 0.05, bottom: floorOn ? 0.72 : 0.88 };

    if (surfaceOn) createSeaSurface(container);
    if (floorOn) createSeaFloor(container, { speedMultiplier, sizeScale: fishScale(sizeMultiplier) });

    const field = createSpawnField(container, {
      className: "fish-field",
      count,
      createItem: () => document.createElement("div"),
      randomize: (el) => randomizeFish(el, sizeMultiplier, speedMultiplier, band, settings.sharkFrequency),
      placeStatic(el) {
        el.style.setProperty("--from-x", `${randomBetween(5, 90)}vw`);
      },
    });
    if (!prefersReducedMotion) {
      startSharkHunt(field, { eats: settings.sharkEats, bounds: band });
    }
    scheduleRareEvent(field, {
      frequency: settings.sharkFrequency,
      play: () => launchSubmarine(field, { band, sizeScale: fishScale(sizeMultiplier), speedMultiplier }),
    });
    return field;
  },
};

