import { fishBaseSizeRange, fishBaseDurationRange } from "../../../defaults.js";
import { randomBetween, createSpawnField, svgEl } from "./util.js";

function buildFish() {
  const fish = document.createElement("div");
  fish.className = "fish-field__fish";

  const bob = document.createElement("div");
  bob.className = "fish-field__bob";

  const svg = svgEl("svg", { class: "fish-field__body", viewBox: "0 0 40 20", "aria-hidden": "true" });
  const tail = svgEl("path", { class: "fish-field__tail", d: "M27 10 L39 3 Q36 10 39 17 Z" });
  const body = svgEl("ellipse", { cx: "16", cy: "10", rx: "13", ry: "6.5" });
  const eye = svgEl("circle", { class: "fish-field__eye", cx: "8", cy: "8.5", r: "1" });
  svg.append(tail, body, eye);

  bob.appendChild(svg);
  fish.appendChild(bob);
  return fish;
}

function randomizeFish(el, sizeMultiplier, speedMultiplier) {
  const size = randomBetween(...fishBaseSizeRange) * sizeMultiplier;
  const duration = randomBetween(...fishBaseDurationRange) / speedMultiplier;
  const swimsRight = Math.random() < 0.5;
  el.style.setProperty("--size", `${size}px`);
  el.style.setProperty("--from-x", swimsRight ? "-10vw" : "100vw");
  el.style.setProperty("--to-x", swimsRight ? "100vw" : "-10vw");
  el.style.setProperty("--y", `${randomBetween(5, 90)}vh`);
  el.style.setProperty("--drift-y", `${randomBetween(-10, 10)}vh`);
  el.style.setProperty("--flip", swimsRight ? "-1" : "1");
  el.style.setProperty("--wave", `${randomBetween(0.5, 2.5)}vh`);
  el.style.setProperty("--bob-duration", `${randomBetween(2500, 5000) / speedMultiplier}ms`);
  el.style.setProperty("--wag-duration", `${randomBetween(500, 900) / speedMultiplier}ms`);
  el.style.setProperty("--duration", `${duration}ms`);
  return randomBetween(0, duration);
}

export const fish = {
  id: "fish",
  label: "Fish",
  controls: ["count", "size", "speed"],
  create(container, { count, sizeMultiplier, speedMultiplier }) {
    return createSpawnField(container, {
      className: "fish-field",
      count,
      createItem: buildFish,
      randomize: (el) => randomizeFish(el, sizeMultiplier, speedMultiplier),
      placeStatic(el) {
        el.style.setProperty("--from-x", `${randomBetween(5, 90)}vw`);
      },
    });
  },
};
