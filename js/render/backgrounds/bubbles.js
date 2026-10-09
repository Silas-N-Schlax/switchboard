import { bubbleBaseSizeRange, bubbleBaseDurationRange } from "../../../defaults.js";
import { randomBetween, randomInRange, createSpawnField } from "./util.js";

function randomizeBubble(el, sizeMultiplier, speedMultiplier) {
  const size = randomInRange(bubbleBaseSizeRange) * sizeMultiplier;
  const duration = randomInRange(bubbleBaseDurationRange) / speedMultiplier;
  el.style.setProperty("--size", `${size}px`);
  el.style.setProperty("--start-x", `${randomBetween(0, 100)}vw`);
  el.style.setProperty("--drift-x", `${randomBetween(-15, 15)}vw`);
  el.style.setProperty("--start-y", `${randomBetween(0, 100)}vh`);
  el.style.setProperty("--drift-y", `${randomBetween(-20, -5)}vh`);
  el.style.setProperty("--duration", `${duration}ms`);
  return randomBetween(0, 8000);
}

export const bubbles = {
  id: "bubbles",
  label: "Bubbles",
  controls: ["count", "size", "speed"],
  create(container, { count, sizeMultiplier, speedMultiplier }) {
    return createSpawnField(container, {
      className: "bubble-field",
      count,
      createItem() {
        const bubble = document.createElement("div");
        bubble.className = "bubble-field__bubble";
        return bubble;
      },
      randomize: (el) => randomizeBubble(el, sizeMultiplier, speedMultiplier),
      placeStatic(el) {
        el.style.animation = "none";
        el.style.opacity = "0.9";
        el.style.transform = "translate(var(--start-x), var(--start-y))";
      },
    });
  },
};
