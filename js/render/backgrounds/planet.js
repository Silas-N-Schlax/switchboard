// The world curving along the bottom of the stratosphere. Weather layers spin about the
// planet's centre so features follow the limb, and each layer repeats every PERIOD_DEG
// so the spin loops seamlessly. Bands are drawn as concentric rings, which need no spin.
import { svgEl, seededRandom } from "./util.js";

export const WIDTH = 1600;
export const HEIGHT = 300;
const CX = 800;
// A circle far wider than the screen, so only a gentle arc shows (limb dips ~100 units at the edges).
export const PLANET_RADIUS = 3220;
const R = PLANET_RADIUS;
export const LIMB_TOP_Y = 140;
const CY = LIMB_TOP_Y + R;
const PERIOD_DEG = 40;
// The visible arc is about ±15°; these copies cover it through a full period of spin either way.
const COPIES = [-2, -1, 0, 1];
const BASE_SPIN_MS = 240000;
const BASE_SWIRL_MS = 70000;

// A circle sags about h² / 2r over a half-span h, so orbiting craft bow to match the limb.
export function arcBowPx(halfSpanPx, radiusPx) {
  return halfSpanPx ** 2 / (2 * radiusPx);
}

const ring = (depth) => R - depth;
const top = (depth) => LIMB_TOP_Y + depth;

function between(random, min, max) {
  return min + random() * (max - min);
}

// Flattened toward the limb, the way a storm seen nearly edge-on would be.
function foreshorten(depth) {
  return Math.min(0.55, 0.18 + depth / 260);
}

function wisp({ depth, length, thickness, tone, opacity }) {
  return () =>
    svgEl("ellipse", {
      class: `stratosphere-scene__tone--${tone}`,
      cx: CX,
      cy: top(depth),
      rx: length / 2,
      ry: thickness,
      opacity,
    });
}

function spiralArm(size, offset, turns) {
  const steps = 28;
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = offset + t * turns * Math.PI * 2;
    points.push(`${(Math.cos(angle) * size * t).toFixed(1)} ${(Math.sin(angle) * size * t).toFixed(1)}`);
  }
  return `M${points.join(" L")}`;
}

// The haze disc gives the spinning group a centred bounding box, so it turns in place.
function swirl({ depth, size, arms, turns, tone, coreTone, opacity, reverse, spinMs }) {
  return () => {
    const place = svgEl("g", { transform: `translate(${CX} ${top(depth)}) scale(1 ${foreshorten(depth)})` });
    const spin = svgEl("g", {
      class: `stratosphere-scene__swirl${reverse ? " stratosphere-scene__swirl--reverse" : ""}`,
    });
    spin.style.setProperty("--swirl-ms", `${spinMs}`);
    spin.append(
      svgEl("circle", { class: `stratosphere-scene__tone--${tone}`, r: size, opacity: opacity * 0.35 }),
      ...Array.from({ length: arms }, (_, i) =>
        svgEl("path", {
          class: `stratosphere-scene__arm stratosphere-scene__tone-stroke--${tone}`,
          d: spiralArm(size, (i * Math.PI * 2) / arms, turns),
          opacity,
        })
      )
    );
    if (coreTone) {
      spin.appendChild(svgEl("circle", { class: `stratosphere-scene__tone--${coreTone}`, r: size * 0.18, opacity }));
    }
    place.appendChild(spin);
    return place;
  };
}

function oval({ depth, width, height, tone, opacity }) {
  return () => {
    const place = svgEl("g", { transform: `translate(${CX} ${top(depth)}) scale(1 ${foreshorten(depth) * 2})` });
    place.appendChild(
      svgEl("ellipse", { class: `stratosphere-scene__tone--${tone}`, rx: width / 2, ry: height / 2, opacity })
    );
    return place;
  };
}

function scatter(random, count, make) {
  return Array.from({ length: count }, () => ({ angle: random() * PERIOD_DEG, draw: make(random) }));
}

function spinLayer(features, { spinScale = 1, reverse = false } = {}) {
  const layer = svgEl("g", {
    class: `stratosphere-scene__weather${reverse ? " stratosphere-scene__weather--reverse" : ""}`,
  });
  layer.style.setProperty("--spin-ms", `${BASE_SPIN_MS * spinScale}`);
  for (const { angle, draw } of features) {
    for (const copy of COPIES) {
      const placed = svgEl("g", { transform: `rotate(${angle + copy * PERIOD_DEG} ${CX} ${CY})` });
      placed.appendChild(draw());
      layer.appendChild(placed);
    }
  }
  return layer;
}

function bandRings(bands) {
  const group = svgEl("g", { class: "stratosphere-scene__bands" });
  group.append(
    ...bands.map(({ depth, width, tone, opacity }) =>
      svgEl("circle", {
        class: `stratosphere-scene__tone-stroke--${tone}`,
        cx: CX,
        cy: CY,
        r: ring(depth),
        "stroke-width": width,
        fill: "none",
        opacity,
      })
    )
  );
  return group;
}

function stackBands(random, { count, minWidth, maxWidth, opacity }) {
  const bands = [];
  let depth = 4;
  for (let i = 0; i < count; i++) {
    const width = between(random, minWidth, maxWidth);
    bands.push({ depth: depth + width / 2, width, tone: i % 2 ? "dark" : "light", opacity: opacity * between(random, 0.6, 1.2) });
    depth += width + between(random, 0, 6);
  }
  return bands;
}

function earth(random) {
  const clouds = [
    ...scatter(random, 30, (r) =>
      wisp({ depth: between(r, 6, 150), length: between(r, 40, 200), thickness: between(r, 1.2, 3.6), tone: "light", opacity: between(r, 0.08, 0.16) })
    ),
    ...scatter(random, 3, (r) =>
      swirl({ depth: between(r, 30, 110), size: between(r, 22, 36), arms: 3, turns: 1.1, tone: "light", coreTone: "dark", opacity: 0.16, reverse: r() < 0.5, spinMs: BASE_SWIRL_MS })
    ),
  ];
  return [spinLayer(clouds)];
}

function gasGiant(random) {
  const bands = stackBands(random, { count: 10, minWidth: 8, maxWidth: 24, opacity: 0.14 });
  const turbulence = bands.map((band, i) =>
    spinLayer(
      scatter(random, 14, (r) =>
        wisp({ depth: band.depth + between(r, -band.width / 3, band.width / 3), length: between(r, 30, 110), thickness: between(r, 1, band.width / 4), tone: band.tone === "light" ? "dark" : "light", opacity: between(r, 0.06, 0.14) })
      ),
      { spinScale: between(random, 0.5, 1.3), reverse: i % 2 === 1 }
    )
  );
  const { depth } = bands[4];
  const angle = random() * PERIOD_DEG;
  const spot = spinLayer(
    [
      { angle, draw: oval({ depth, width: 120, height: 34, tone: "dark", opacity: 0.22 }) },
      { angle, draw: swirl({ depth, size: 30, arms: 2, turns: 1.4, tone: "light", opacity: 0.2, reverse: false, spinMs: BASE_SWIRL_MS * 0.7 }) },
    ],
    { spinScale: 0.9 }
  );
  return [bandRings(bands), ...turbulence, spot];
}

function iceGiant(random) {
  const bands = stackBands(random, { count: 4, minWidth: 20, maxWidth: 40, opacity: 0.06 });
  const spotAngle = random() * PERIOD_DEG;
  const spot = spinLayer(
    [
      { angle: spotAngle, draw: oval({ depth: 70, width: 80, height: 26, tone: "dark", opacity: 0.28 }) },
      { angle: spotAngle + 1.2, draw: wisp({ depth: 58, length: 60, thickness: 2.2, tone: "light", opacity: 0.22 }) },
    ],
    { spinScale: 1.2 }
  );
  const streaks = spinLayer(
    scatter(random, 12, (r) =>
      wisp({ depth: between(r, 10, 140), length: between(r, 80, 220), thickness: between(r, 0.8, 1.8), tone: "light", opacity: between(r, 0.12, 0.22) })
    ),
    { spinScale: 0.35, reverse: true }
  );
  return [bandRings(bands), spot, streaks];
}

function dusty(random) {
  const patches = spinLayer(
    scatter(random, 10, (r) =>
      wisp({ depth: between(r, 15, 150), length: between(r, 80, 260), thickness: between(r, 5, 14), tone: "dark", opacity: between(r, 0.14, 0.26) })
    ),
    { spinScale: 1.4 }
  );
  const dust = spinLayer(
    [
      ...scatter(random, 5, (r) =>
        wisp({ depth: between(r, 10, 120), length: between(r, 160, 320), thickness: between(r, 3, 7), tone: "light", opacity: between(r, 0.04, 0.08) })
      ),
      ...scatter(random, 3, (r) =>
        swirl({ depth: between(r, 30, 120), size: between(r, 5, 9), arms: 2, turns: 1.6, tone: "light", opacity: 0.18, reverse: r() < 0.5, spinMs: BASE_SWIRL_MS * 0.12 })
      ),
    ],
    { spinScale: 0.8 }
  );
  return [patches, dust];
}

// `atmosphere` is the glow's depth, in viewBox units.
export const planetTypes = [
  { id: "earth", label: "Earth", seed: 20261010, atmosphere: 14, build: earth },
  { id: "gasGiant", label: "Gas giant", seed: 20261013, atmosphere: 22, build: gasGiant },
  { id: "iceGiant", label: "Ice giant", seed: 20261014, atmosphere: 18, build: iceGiant },
  { id: "dusty", label: "Dusty world", seed: 20261015, atmosphere: 6, build: dusty },
];

function planetCircle(attrs = {}, grow = 0) {
  return svgEl("circle", { cx: CX, cy: CY, r: R + grow, ...attrs });
}

export function buildPlanet(typeId, speedMultiplier) {
  const type = planetTypes.find(({ id }) => id === typeId) ?? planetTypes[0];
  const svg = svgEl("svg", {
    class: `stratosphere-scene__world stratosphere-scene__world--${type.id}`,
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    preserveAspectRatio: "xMidYMax slice",
    "aria-hidden": "true",
  });
  svg.style.setProperty("--speed", `${speedMultiplier}`);
  svg.style.setProperty("--spin-origin", `${CX}px ${CY}px`);
  svg.style.setProperty("--spin-period", `${PERIOD_DEG}deg`);

  const defs = svgEl("defs");
  const glow = svgEl("filter", { id: "stratosphere-scene-glow", x: "-10%", y: "-10%", width: "120%", height: "120%" });
  glow.appendChild(svgEl("feGaussianBlur", { stdDeviation: 8 }));
  const surface = svgEl("linearGradient", {
    id: "stratosphere-scene-surface",
    gradientUnits: "userSpaceOnUse",
    x1: 0,
    y1: LIMB_TOP_Y,
    x2: 0,
    y2: HEIGHT,
  });
  surface.append(
    svgEl("stop", { offset: "0", class: "stratosphere-scene__surface-lit" }),
    svgEl("stop", { offset: "1", class: "stratosphere-scene__surface-deep" })
  );
  const clip = svgEl("clipPath", { id: "stratosphere-scene-planet" });
  clip.appendChild(planetCircle());
  defs.append(glow, surface, clip);

  const weather = svgEl("g", { "clip-path": "url(#stratosphere-scene-planet)" });
  weather.append(...type.build(seededRandom(type.seed)));

  svg.append(
    defs,
    planetCircle({ class: "stratosphere-scene__atmosphere", filter: "url(#stratosphere-scene-glow)" }, type.atmosphere),
    planetCircle({ class: "stratosphere-scene__planet" }),
    weather,
    planetCircle({ class: "stratosphere-scene__limb" })
  );
  return svg;
}
