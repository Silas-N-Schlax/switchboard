// The stratosphere's semi-rare sight: the International Space Station gliding past
// overhead, solar arrays spread wide.
import { randomBetween, svgEl, animationDone } from "./util.js";

const BASE_LENGTH_PX = 150;
const BASE_CROSSING_MS = 55000;
const ARRAY_XS = [12, 26, 84, 98];

function issShape() {
  const svg = svgEl("svg", { class: "stratosphere-scene__iss-shape", viewBox: "0 0 120 60", "aria-hidden": "true" });
  const arrays = ARRAY_XS.map((x) => `M${x} 4 H${x + 10} V27 H${x} Z M${x} 33 H${x + 10} V56 H${x} Z`).join(" ");
  const cells = ARRAY_XS.map(
    (x) => `M${x + 5} 4 V27 M${x + 5} 33 V56 M${x} 10 H${x + 10} M${x} 16 H${x + 10} M${x} 22 H${x + 10} ` +
      `M${x} 39 H${x + 10} M${x} 45 H${x + 10} M${x} 51 H${x + 10}`
  ).join(" ");
  svg.append(
    svgEl("path", { class: "stratosphere-scene__iss-array", d: arrays }),
    svgEl("path", { class: "stratosphere-scene__iss-cells", d: cells }),
    svgEl("path", { class: "stratosphere-scene__iss-radiator", d: "M44 34 L40 46 H46 L48 34 Z M76 34 L80 46 H74 L72 34 Z" }),
    // Truss and modules share one path so where they overlap doesn't read darker.
    svgEl("path", {
      class: "stratosphere-scene__iss-hull",
      d: "M8 28.5 H112 V31.5 H8 Z M56 10 H64 V50 H56 Z M48 20 H72 V26 H48 Z M50 36 H70 V42 H50 Z",
    }),
    svgEl("circle", { class: "stratosphere-scene__iss-light", cx: 60, cy: 52, r: 1.2 })
  );
  return svg;
}

// `band` is open space in vh; the station keeps to its upper half.
export function launchIss(layer, { band, scale = 1, speedMultiplier = 1 }) {
  const goesRight = Math.random() < 0.5;
  const length = BASE_LENGTH_PX * scale;
  const vh = window.innerHeight / 100;
  const fromY = vh * randomBetween(band.top, band.top + (band.bottom - band.top) * 0.5);
  const toY = fromY + vh * randomBetween(-8, 8);
  const fromX = goesRight ? -length - 20 : window.innerWidth + 20;
  const toX = goesRight ? window.innerWidth + 20 : -length - 20;
  const rotation = randomBetween(-12, 12);

  const iss = document.createElement("div");
  iss.className = "stratosphere-scene__iss";
  iss.style.width = `${length}px`;
  iss.style.height = `${length / 2}px`;
  iss.appendChild(issShape());
  layer.appendChild(iss);

  const pass = iss.animate(
    [
      { transform: `translate(${fromX}px, ${fromY}px) rotate(${rotation}deg)` },
      { transform: `translate(${toX}px, ${toY}px) rotate(${rotation}deg)` },
    ],
    { duration: BASE_CROSSING_MS / speedMultiplier, easing: "linear" }
  );
  return animationDone(pass).then(() => iss.remove());
}
