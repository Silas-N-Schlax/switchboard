export const prefersReducedMotion = window.matchMedia?.(
  "(prefers-reduced-motion: reduce)"
).matches;

const SVG_NS = "http://www.w3.org/2000/svg";

export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function restartAnimation(el) {
  el.style.animation = "none";
  // eslint-disable-next-line no-unused-expressions
  el.offsetHeight;
  el.style.animation = "";
}

// Each item plays one CSS animation "life"; on animationend it's re-randomized and
// restarted so it respawns elsewhere rather than looping the exact same path.
export function createSpawnField(container, { className, count, createItem, randomize, placeStatic }) {
  const field = document.createElement("div");
  field.className = className;
  container.appendChild(field);

  for (let i = 0; i < count; i++) {
    const item = createItem();
    const initialDelayMs = randomize(item);

    if (prefersReducedMotion) {
      placeStatic(item);
    } else {
      item.style.animationDelay = `-${initialDelayMs}ms`;
      item.addEventListener("animationend", (event) => {
        if (event.target !== item) return;
        randomize(item);
        restartAnimation(item);
      });
    }
    field.appendChild(item);
  }
  return field;
}
