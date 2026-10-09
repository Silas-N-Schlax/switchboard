// The stratosphere's super-rare sight: a saucer drifts in, hangs there a few seconds with
// its rim lights pulsing, rocks back, then is gone in a blink.
import { randomBetween, randomInRange, svgEl, animationDone } from "./util.js";

const BASE_WIDTH_PX = 110;
const ENTER_MS = 9000;
const HOVER_MS_RANGE = { min: 4000, max: 6500 };
const WIND_UP_MS = 500;
const EXIT_MS = 900;
const LIGHT_XS = [16, 33, 50, 67, 84];

function saucerShape() {
  const svg = svgEl("svg", { class: "stratosphere-scene__alien-shape", viewBox: "0 0 100 50", "aria-hidden": "true" });
  svg.append(
    svgEl("ellipse", { class: "stratosphere-scene__alien-halo", cx: 50, cy: 29, rx: 50, ry: 16 }),
    svgEl("path", { class: "stratosphere-scene__alien-dome", d: "M35 24 C35 10 65 10 65 24 Z" }),
    svgEl("path", {
      class: "stratosphere-scene__alien-hull",
      d: "M4 28 C10 22 30 21 50 21 C70 21 90 22 96 28 C90 34 70 36 50 36 C30 36 10 34 4 28 Z",
    }),
    svgEl("ellipse", { class: "stratosphere-scene__alien-underside", cx: 50, cy: 35.5, rx: 16, ry: 3.5 }),
    ...LIGHT_XS.map((cx, i) => {
      const light = svgEl("circle", { class: "stratosphere-scene__alien-light", cx, cy: 29.5, r: 1.8 });
      light.style.animationDelay = `${i * 240}ms`;
      return light;
    })
  );
  return svg;
}

// `band` is open space in vh. It leaves the way it didn't come, climbing as it goes.
export function launchAlien(layer, { band, scale = 1, speedMultiplier = 1 }) {
  const fromLeft = Math.random() < 0.5;
  const lean = fromLeft ? 1 : -1;
  const width = BASE_WIDTH_PX * scale;
  const vh = window.innerHeight / 100;
  const hoverX = window.innerWidth * randomBetween(0.25, 0.75) - width / 2;
  const hoverY = vh * randomBetween(band.top + 4, band.top + (band.bottom - band.top) * 0.6);
  const fromX = fromLeft ? -width * 1.5 : window.innerWidth + width * 0.5;
  const fromY = hoverY - vh * randomBetween(4, 12);
  const toX = fromLeft ? window.innerWidth + width * 2 : -width * 3;
  const toY = hoverY - vh * randomBetween(15, 35);

  const enterMs = ENTER_MS / speedMultiplier;
  const hoverMs = randomInRange(HOVER_MS_RANGE);
  const totalMs = enterMs + hoverMs + WIND_UP_MS + EXIT_MS;
  const at = (x, y, tilt, stretch = 1) => `translate(${x}px, ${y}px) rotate(${tilt}deg) scaleX(${stretch})`;

  const craft = document.createElement("div");
  craft.className = "stratosphere-scene__alien";
  craft.style.width = `${width}px`;
  craft.style.height = `${width / 2}px`;
  const bob = document.createElement("div");
  bob.className = "stratosphere-scene__alien-bob";
  bob.appendChild(saucerShape());
  craft.appendChild(bob);
  layer.appendChild(craft);

  const flight = craft.animate(
    [
      { offset: 0, transform: at(fromX, fromY, 8 * lean), easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
      { offset: enterMs / totalMs, transform: at(hoverX, hoverY, 0) },
      {
        offset: (enterMs + hoverMs) / totalMs,
        transform: at(hoverX, hoverY, 0),
        easing: "ease-out",
      },
      {
        offset: (enterMs + hoverMs + WIND_UP_MS) / totalMs,
        transform: at(hoverX - lean * width * 0.08, hoverY + vh * 0.6, -6 * lean),
        easing: "cubic-bezier(0.6, 0, 0.9, 0.5)",
      },
      { offset: 1, transform: at(toX, toY, 10 * lean, 1.8) },
    ],
    { duration: totalMs }
  );
  return animationDone(flight).then(() => craft.remove());
}
