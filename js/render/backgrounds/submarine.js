// The fish view's super-rare sight: a submarine cruising along the bottom of open water,
// headlight on, trailing bubbles. sharkHunt.js makes fish near its nose dart away.
import { randomBetween, svgEl, animationDone } from "./util.js";

const BASE_LENGTH_PX = 220;
const BASE_CROSSING_MS = 70000;
const BUBBLE_EVERY_MS = 260;
const BUBBLE_RISE_MS = 3200;

function submarineShape() {
  const svg = svgEl("svg", { class: "fish-field__sub-shape", viewBox: "0 0 200 70", "aria-hidden": "true" });
  const defs = svgEl("defs");
  const beam = svgEl("linearGradient", { id: "fish-field-sub-beam", x1: "1", y1: "0", x2: "0", y2: "0" });
  beam.append(
    svgEl("stop", { offset: "0", class: "fish-field__sub-beam-near" }),
    svgEl("stop", { offset: "1", class: "fish-field__sub-beam-far" })
  );
  defs.appendChild(beam);

  svg.append(
    defs,
    svgEl("path", { class: "fish-field__sub-beam", d: "M22 38 L-160 8 L-160 72 L22 42 Z" }),
    // Hull, sail and rudders share one path so where they overlap doesn't read darker.
    svgEl("path", {
      class: "fish-field__sub-hull",
      d:
        "M20 40 C20 29 38 25 66 25 L144 26 C158 26.5 171 31 184 37 L189 37.8 L189 42.2 L184 43 " +
        "C171 49 158 53.5 144 54 L66 55 C38 55 20 51 20 40 Z " +
        "M80 25.4 L85 9 L118 9 L124 26 Z " +
        "M160 28.2 L171 14 L179 14 L180.5 34.2 Z M160 51.8 L171 66 L179 66 L180.5 45.8 Z",
    }),
    svgEl("path", { class: "fish-field__sub-detail", d: "M163 40 L182 39.2 M144 26.4 C149 33 149 47 144 53.6" }),
    svgEl("path", { class: "fish-field__sub-periscope", d: "M100 9 L100 1 L93 1" }),
    ...[58, 82, 106, 130].map((cx) => svgEl("circle", { class: "fish-field__sub-porthole", cx, cy: 39, r: 3.6 })),
    svgEl("path", { class: "fish-field__sub-hub", d: "M189 37.2 Q197 37.6 197 40 Q197 42.4 189 42.8 Z" }),
    svgEl("path", {
      class: "fish-field__sub-propeller",
      d: "M193 40 C197.5 34 198 28.5 195 26.4 C191.6 28.5 190.6 34 193 40 C197.5 46 198 51.5 195 53.6 C191.6 51.5 190.6 46 193 40 Z",
    })
  );
  return svg;
}

function releaseBubble(field, sub, flip) {
  const rect = sub.getBoundingClientRect();
  const tailX = flip === -1 ? rect.left + rect.width * 0.06 : rect.right - rect.width * 0.06;
  const bubble = document.createElement("div");
  bubble.className = "fish-field__sub-bubble";
  const size = randomBetween(3, 8);
  bubble.style.width = bubble.style.height = `${size}px`;
  bubble.style.left = `${tailX + randomBetween(-6, 6)}px`;
  bubble.style.top = `${rect.top + rect.height * randomBetween(0.45, 0.65)}px`;
  field.appendChild(bubble);
  const rise = bubble.animate(
    [
      { transform: "translate(0, 0)", opacity: 0.5 },
      { transform: `translate(${randomBetween(-12, 12)}px, -${randomBetween(60, 140)}px)`, opacity: 0 },
    ],
    { duration: BUBBLE_RISE_MS * randomBetween(0.8, 1.2), easing: "ease-out" }
  );
  animationDone(rise).then(() => bubble.remove());
}

// `band` is open water as viewport-height fractions; the sub keeps near its floor.
export function launchSubmarine(field, { band, sizeScale = 1, speedMultiplier = 1 }) {
  const goesRight = Math.random() < 0.5;
  const flip = goesRight ? -1 : 1;
  const length = BASE_LENGTH_PX * Math.min(1.6, Math.max(0.7, sizeScale));
  const height = length * 0.35;
  const y = window.innerHeight * band.bottom - height * randomBetween(1.1, 1.6);
  const fromX = goesRight ? -length * 1.9 : window.innerWidth + length * 0.1;
  const toX = goesRight ? window.innerWidth + length * 0.1 : -length * 1.9;

  const sub = document.createElement("div");
  sub.className = "fish-field__sub";
  sub.dataset.flip = String(flip);
  sub.style.width = `${length}px`;
  sub.style.height = `${height}px`;
  sub.style.setProperty("--flip", flip);
  const bob = document.createElement("div");
  bob.className = "fish-field__sub-bob";
  bob.appendChild(submarineShape());
  sub.appendChild(bob);
  field.appendChild(sub);

  const cruise = sub.animate(
    [{ transform: `translate(${fromX}px, ${y}px)` }, { transform: `translate(${toX}px, ${y}px)` }],
    { duration: BASE_CROSSING_MS / speedMultiplier, easing: "linear" }
  );
  const bubbles = setInterval(() => {
    if (!sub.isConnected) return clearInterval(bubbles);
    releaseBubble(field, sub, flip);
  }, BUBBLE_EVERY_MS);

  return animationDone(cruise).then(() => {
    clearInterval(bubbles);
    sub.remove();
  });
}
