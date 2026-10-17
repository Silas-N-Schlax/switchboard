import {
  bubbleBaseSizeRange,
  bubbleBaseDurationRange,
  bubblePopChance,
  bubbleFishChance,
  bubbleFishMinSize,
  bubbleAbsorberChance,
  bubbleAbsorberStartSize,
  bubbleAbsorberBurstVmin,
  bubbleAbsorberBurstCount,
} from "../../../defaults.js";
import { randomBetween, randomInRange, svgEl, prefersReducedMotion, animationDone } from "./util.js";
import { fishSpecies } from "./fishSpecies.js";
import { buildSilhouette } from "./fish.js";

const POP_MS = 160;
const RING_MS = 320;
const DROPLET_COUNT = 7;
const FISH_FALL_MS = 1600;
const ABSORB_MS = 450;
// Rise time relative to the slowest possible ordinary bubble, so it's always the slowest.
const ABSORBER_PACE = 2;
// Pull is GRAVITY_ACCEL px/s² at one absorber radius, falling off with distance squared,
// and reaches out to GRAVITY_REACH radii.
const GRAVITY_ACCEL = 320;
const GRAVITY_REACH = 3;
const GRAVITY_DAMPING = 0.985;
// Area added per swallowed bubble, relative to that bubble's own area.
const ABSORB_GROWTH = 0.5;
const BURST_MS = { min: 2600, max: 5200 };
const TRAPPABLE_FISH = fishSpecies.filter((species) => species.id !== "shark");

// A real Ocean fish; the wrapper carries .fish-field so it picks up the Ocean's fish styles.
function buildFish() {
  const species = TRAPPABLE_FISH[Math.floor(Math.random() * TRAPPABLE_FISH.length)];
  const [width, height] = species.viewBox;
  const wrapper = document.createElement("div");
  wrapper.className = "fish-field bubble-field__fish";
  const aspect = height / width;
  const fishWidth = Math.min(0.6, 0.5 / aspect);
  wrapper.style.setProperty("--fish-width", `${fishWidth * 100}%`);
  wrapper.style.setProperty("--fish-height", `${fishWidth * aspect * 100}%`);
  wrapper.style.setProperty("--wag-duration", `${species.wagMs}ms`);
  wrapper.appendChild(buildSilhouette(species, Math.random() < 0.5 ? 1 : -1));
  return wrapper;
}

function buildShell() {
  const svg = svgEl("svg", { class: "bubble-field__body", viewBox: "0 0 100 100", "aria-hidden": "true" });
  svg.append(
    svgEl("circle", { class: "bubble-field__shell", cx: 50, cy: 50, r: 48 }),
    svgEl("path", { class: "bubble-field__shine", d: "M20 46 A31 31 0 0 1 44 19" }),
    svgEl("circle", { class: "bubble-field__shine-dot", cx: 22, cy: 58, r: 2.6 })
  );
  return svg;
}

function rollAbsorber({ sizeMultiplier, speedMultiplier }) {
  const slowestOrdinary = bubbleBaseDurationRange.max / 0.7;
  const fullDuration = slowestOrdinary / speedMultiplier;
  return { absorber: true, depth: 0.9, size: bubbleAbsorberStartSize * Math.max(sizeMultiplier, 0.5), fullDuration };
}

// Far bubbles (low depth) are small, faint and slow; near ones are big, bold and quick.
function rollBubble({ absorber, options: { sizeMultiplier, speedMultiplier, pop, rareFrequency } }) {
  if (!absorber && Math.random() < bubbleAbsorberChance * rareFrequency) {
    return rollAbsorber({ sizeMultiplier, speedMultiplier });
  }
  const fish = Math.random() < bubbleFishChance * rareFrequency;
  const depth = fish ? randomBetween(0.6, 1) : Math.random();
  const baseSize = randomInRange(bubbleBaseSizeRange) * sizeMultiplier * (0.45 + 0.75 * depth);
  const size = fish ? Math.max(baseSize, bubbleFishMinSize) : baseSize;
  const fullDuration = randomInRange(bubbleBaseDurationRange) / speedMultiplier / (0.7 + 0.6 * depth);
  const pops = fish ? pop : pop && Math.random() < bubblePopChance;
  const endVh = pops ? randomBetween(fish ? 25 : 10, 65) : null;
  return { fish, depth, size, fullDuration, pops, endVh };
}

function buildBubble(el, roll) {
  el.className = roll.fish ? "bubble-field__bubble bubble-field__bubble--fish" : "bubble-field__bubble";
  el.style.zIndex = String(Math.round(roll.depth * 10));
  el.style.setProperty("--size", `${roll.size}px`);
  el.style.setProperty("--depth-opacity", String(0.35 + 0.6 * roll.depth));
  el.style.setProperty("--wobble", `${randomBetween(0.6, 2.2)}vw`);
  el.style.setProperty("--wobble-duration", `${randomBetween(3200, 6400)}ms`);

  const wobble = document.createElement("div");
  wobble.className = "bubble-field__wobble";
  wobble.style.animationDelay = `-${randomBetween(0, 6400)}ms`;
  const body = buildShell();
  wobble.appendChild(body);
  if (roll.fish) wobble.appendChild(buildFish());
  el.replaceChildren(wobble);
  return { wobble, body };
}

function popBubble(wobble, body, size) {
  const animations = [
    body.animate(
      [
        { transform: "scale(1)", opacity: 1 },
        { transform: "scale(1.18)", opacity: 0 },
      ],
      { duration: POP_MS, easing: "ease-out", fill: "forwards" }
    ),
  ];
  const ring = document.createElement("div");
  ring.className = "bubble-field__ring";
  wobble.appendChild(ring);
  animations.push(
    ring.animate(
      [
        { transform: "scale(0.9)", opacity: 0.7 },
        { transform: "scale(1.5)", opacity: 0 },
      ],
      { duration: RING_MS, easing: "ease-out", fill: "forwards" }
    )
  );
  for (let i = 0; i < DROPLET_COUNT; i++) {
    const droplet = document.createElement("div");
    droplet.className = "bubble-field__droplet";
    wobble.appendChild(droplet);
    const angle = (i / DROPLET_COUNT) * Math.PI * 2 + randomBetween(-0.3, 0.3);
    const reach = size * randomBetween(0.65, 0.95);
    animations.push(
      droplet.animate(
        [
          { transform: "translate(0, 0)", opacity: 0.9 },
          { transform: `translate(${Math.cos(angle) * reach}px, ${Math.sin(angle) * reach}px)`, opacity: 0 },
        ],
        { duration: RING_MS, easing: "ease-out", fill: "forwards" }
      )
    );
  }
  const fish = wobble.querySelector(".bubble-field__fish");
  if (fish) {
    animations.push(
      fish.animate(
        [
          { transform: "translateY(0) rotate(0deg)", opacity: 1 },
          { transform: `translateY(${size * 0.4}px) rotate(-25deg)`, opacity: 1, offset: 0.35 },
          { transform: "translateY(45vh) rotate(-80deg)", opacity: 0 },
        ],
        { duration: FISH_FALL_MS, easing: "cubic-bezier(0.45, 0, 0.9, 0.6)", fill: "forwards" }
      )
    );
  }
  return Promise.all(animations.map(animationDone));
}

function riseKeyframes(x, drift, startY, endY) {
  return [{ transform: `translate(${x}vw, ${startY})` }, { transform: `translate(${x + drift}vw, ${endY})` }];
}

function centerOf(el) {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, r: rect.width / 2 };
}

// The swallowed bubble's rise is held while it's pulled into the absorber, then cancelled
// so its life loop moves straight on to the next life.
function absorb(entry, target) {
  entry.phase = "absorbed";
  entry.rise.pause();
  const from = centerOf(entry.body);
  const pull = entry.wobble.animate(
    [{ transform: `translate(${target.x - from.x}px, ${target.y - from.y}px) scale(0.15)`, opacity: 0 }],
    { duration: ABSORB_MS, easing: "ease-in", fill: "forwards" }
  );
  entry.absorbed = animationDone(pull).then(() => entry.rise.cancel());
  return from.r * 2;
}

// Gravity rides on the wobble's `translate`, which stacks with both the rise and the
// wobble's own transform animation.
function pull(entry, dx, dy, distance, radius, dt) {
  const velocity = (entry.pull ??= { x: 0, y: 0, vx: 0, vy: 0 });
  if (distance < radius * GRAVITY_REACH) {
    const accel = GRAVITY_ACCEL * (radius / Math.max(distance, radius)) ** 2;
    velocity.vx += (dx / distance) * accel * dt;
    velocity.vy += (dy / distance) * accel * dt;
  }
  velocity.vx *= GRAVITY_DAMPING;
  velocity.vy *= GRAVITY_DAMPING;
  velocity.x += velocity.vx * dt;
  velocity.y += velocity.vy * dt;
  entry.wobble.style.translate = `${velocity.x}px ${velocity.y}px`;
}

// Scatters tiny bubbles from inside the absorber in every direction, far enough to
// leave the screen whichever way they go.
function burstAbsorber(ctx, wobble, body, size) {
  const center = centerOf(body);
  const reach = Math.hypot(window.innerWidth, window.innerHeight);
  const speed = ctx.options.speedMultiplier;
  const animations = [popBubble(wobble, body, size)];
  for (let i = 0; i < bubbleAbsorberBurstCount; i++) {
    const piece = document.createElement("div");
    piece.className = "bubble-field__bubble bubble-field__bubble--burst";
    const pieceSize = randomBetween(5, 18);
    piece.style.setProperty("--size", `${pieceSize}px`);
    piece.style.setProperty("--depth-opacity", String(randomBetween(0.5, 0.95)));
    piece.appendChild(buildShell());
    ctx.field.appendChild(piece);

    const angle = randomBetween(0, Math.PI * 2);
    const start = Math.sqrt(Math.random()) * center.r * 0.8;
    const distance = reach * randomBetween(0.8, 1.2);
    const from = [center.x + Math.cos(angle) * start - pieceSize / 2, center.y + Math.sin(angle) * start - pieceSize / 2];
    const to = [from[0] + Math.cos(angle) * distance, from[1] + Math.sin(angle) * distance];
    const flight = piece.animate(
      [{ transform: `translate(${from[0]}px, ${from[1]}px)` }, { transform: `translate(${to[0]}px, ${to[1]}px)` }],
      { duration: randomInRange(BURST_MS) / speed, easing: "cubic-bezier(0.1, 0.7, 0.4, 1)", fill: "forwards" }
    );
    animations.push(animationDone(flight).then(() => piece.remove()));
  }
  return Promise.all(animations);
}

async function liveAbsorber(el, ctx, roll) {
  ctx.absorber = el;
  const { wobble, body } = buildBubble(el, roll);
  el.classList.add("bubble-field__bubble--absorber");
  const burstSize = (Math.min(window.innerWidth, window.innerHeight) * bubbleAbsorberBurstVmin) / 100;
  let burst = null;
  let size = roll.size;
  const x = randomBetween(20, 80);
  const rise = el.animate(
    riseKeyframes(x, randomBetween(-6, 6), `calc(100vh + ${roll.size}px)`, `-${bubbleAbsorberBurstVmin / 2 + 5}vmin`),
    { duration: roll.fullDuration * ABSORBER_PACE, easing: "linear", fill: "forwards" }
  );

  let last = performance.now();
  function pullAndSwallow(now) {
    if (!ctx.field.isConnected || rise.playState === "finished") return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const self = centerOf(body);
    for (const entry of ctx.entries.values()) {
      if (entry.phase !== "rising") continue;
      const other = centerOf(entry.body);
      const dx = self.x - other.x;
      const dy = self.y - other.y;
      const distance = Math.hypot(dx, dy);
      if (distance > self.r + other.r * 0.5) {
        pull(entry, dx, dy, distance, self.r, dt);
        continue;
      }
      const swallowed = absorb(entry, self);
      size = Math.min(burstSize, Math.sqrt(size * size + ABSORB_GROWTH * swallowed * swallowed));
      el.style.setProperty("--size", `${size}px`);
      if (size >= burstSize) {
        rise.pause();
        burst = burstAbsorber(ctx, wobble, body, size).then(() => rise.cancel());
        return;
      }
      body.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], {
        duration: 380,
        delay: ABSORB_MS * 0.6,
        easing: "ease-out",
      });
    }
    requestAnimationFrame(pullAndSwallow);
  }
  requestAnimationFrame(pullAndSwallow);
  await animationDone(rise);
  await burst;
  ctx.absorber = null;
}

// Each life rises from below the screen, then either drifts off the top or pops partway
// up, and the bubble is re-rolled for its next life.
async function live(el, ctx, firstLife) {
  while (ctx.field.isConnected) {
    const roll = rollBubble(ctx);
    if (roll.absorber) {
      await liveAbsorber(el, ctx, roll);
      continue;
    }
    const { wobble, body } = buildBubble(el, roll);
    const endY = roll.pops ? `${roll.endVh}vh` : `calc(-${roll.size}px - 4vh)`;
    const travel = roll.pops ? (100 - roll.endVh) / 104 : 1;
    const rise = el.animate(riseKeyframes(randomBetween(-5, 100), randomBetween(-8, 8) * travel, "100vh", endY), {
      duration: roll.fullDuration * travel,
      easing: "linear",
      fill: "forwards",
    });
    if (firstLife) rise.currentTime = randomBetween(0, roll.fullDuration * travel * 0.9);
    firstLife = false;

    const entry = { phase: "rising", rise, wobble, body, absorbed: null };
    ctx.entries.set(el, entry);
    await animationDone(rise);
    ctx.entries.delete(el);
    if (!ctx.field.isConnected) return;
    if (entry.absorbed) await entry.absorbed;
    else if (roll.pops) await popBubble(wobble, body, roll.size);
  }
}

// Hidden tabs hold back finish events, so on return every overdue rise ends at once and
// all bubbles restart from the bottom together. play() would rewind a finished animation,
// so only the ones paused here are resumed. Only one field is live at a time, so a new
// one drops the listener left by the field it replaced.
let stopFreezing = null;

function freezeWhileHidden(field) {
  stopFreezing?.();
  let frozen = [];
  function sync() {
    if (!field.isConnected) {
      document.removeEventListener("visibilitychange", sync);
      return;
    }
    if (document.visibilityState === "hidden") {
      frozen = field.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running");
      for (const animation of frozen) animation.pause();
      return;
    }
    for (const animation of frozen) if (animation.playState === "paused") animation.play();
    frozen = [];
  }
  document.addEventListener("visibilitychange", sync);
  stopFreezing = () => document.removeEventListener("visibilitychange", sync);
}

function placeStatic(el, options) {
  const roll = rollBubble({ absorber: true, options: { ...options, pop: false } });
  buildBubble(el, roll);
  el.style.transform = `translate(${randomBetween(0, 95)}vw, ${randomBetween(5, 85)}vh)`;
}

export const bubbles = {
  id: "bubbles",
  label: "Bubbles",
  controls: ["count", "size", "speed"],
  frequencySliders: [{ key: "rareFrequency", label: "Rare sightings" }],
  toggles: [
    { key: "pop", label: "Pop" },
    { key: "tint", label: "Palette tint" },
  ],
  create(container, { count, sizeMultiplier, speedMultiplier, settings = {} }) {
    const field = document.createElement("div");
    field.className = settings.tint === false ? "bubble-field" : "bubble-field bubble-field--tinted";
    container.appendChild(field);

    const options = {
      sizeMultiplier,
      speedMultiplier,
      pop: settings.pop ?? true,
      rareFrequency: settings.rareFrequency ?? 1,
    };
    const ctx = { field, options, entries: new Map(), absorber: null };
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      field.appendChild(el);
      if (prefersReducedMotion) placeStatic(el, options);
      else live(el, ctx, true);
    }
    if (!prefersReducedMotion) freezeWhileHidden(field);
    return field;
  },
};
