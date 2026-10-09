// While a shark is on screen it bends its path toward the nearest fish ahead of it, and
// fish near its head dart away. With `eats` on, the shark locks onto one fish, lunges,
// and eats it if it connects; other fish still dart. Everything rides on each fish's
// .fish-field__steer layer, on top of the CSS swim, so nothing runs without a shark.
// A passing submarine (submarine.js) scatters fish ahead of its nose the same way.

import { randomInRange } from "./util.js";

const IDLE_CHECK_MS = 500;
const HUNT_RANGE = 0.4; // fraction of viewport width ahead of the shark's head
const MAX_STEER = 0.28; // fraction of viewport height the shark may bend off its line
const STEER_SPEED = 70; // px/s
const STEER_RESPONSE = 1.6; // how quickly steering velocity follows the target
const MAX_PITCH_DEG = 10;
const SCARE_RADIUS = 0.35; // fraction of shark length, measured from its head
const DART_RANGE = { min: 0.04, max: 0.08 }; // fraction of viewport height
const DART_MS = 1400;
const FLEE_BOOST = 2.4;
const FLEE_MS = 1800;
const DIVE_STEER_SPEED = 120; // px/s while locked onto a fish it means to eat
const CATCH_RADIUS = 0.15; // fraction of shark length, measured from its head
const LUNGE_RANGE = 2; // shark lengths from its target at which it speeds up
const LUNGE_BOOST = 1.6;
const EAT_MS = 220;
const SUB_SCARE_RADIUS = 0.7; // fraction of sub length, measured from its nose

// Keyed by the steer layer, which is rebuilt on every respawn, so state never leaks
// into a fish's next life.
const fleeing = new WeakMap(); // steer -> { prey, swim, until, rate, boost }
const escaped = new WeakSet(); // steer
const hunters = new WeakMap(); // steer -> { offset, velocity, target, rate }
const eaten = new WeakSet(); // member

function center(rect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function swimAnimation(el) {
  return el.getAnimations().find((a) => a.animationName === "fishSwim");
}

function isOnScreen(rect) {
  return rect.right > 0 && rect.left < window.innerWidth;
}

function steerOf(el) {
  return el.querySelector(".fish-field__steer");
}

function membersOf(el) {
  return [...el.querySelectorAll(".fish-field__member")].filter((m) => !eaten.has(m));
}

function eat(prey, member) {
  eaten.add(member);
  const body = member.querySelector(".fish-field__body");
  body.style.transition = `transform ${EAT_MS}ms ease-in, opacity ${EAT_MS}ms ease-in`;
  body.style.transform = "scaleX(var(--flip, 1)) scale(0.2)";
  body.style.opacity = "0";
  setTimeout(() => {
    if (membersOf(prey).length) {
      member.remove(); // the rest of the school swims on
    } else {
      swimAnimation(prey)?.finish(); // ends its life, so it respawns from an edge
    }
  }, EAT_MS);
}

function dart(prey, steer, sharkY, sharkFlip) {
  const preyY = center(steer.getBoundingClientRect()).y;
  const away = preyY === sharkY ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(preyY - sharkY);
  const amount = window.innerHeight * randomInRange(DART_RANGE);
  const room = away < 0 ? preyY - 20 : window.innerHeight - 20 - preyY;
  const direction = room < amount * 0.5 ? -away : away;

  steer.style.transition = `transform ${DART_MS}ms cubic-bezier(0.25, 0.6, 0.35, 1)`;
  steer.style.transform = `translateY(${direction * amount}px)`;
  // Only fish already heading the shark's way speed up; the rest just dodge vertically.
  const boost = prey.dataset.flip === String(sharkFlip) ? FLEE_BOOST : 1;
  fleeing.set(steer, { prey, swim: swimAnimation(prey), until: performance.now() + FLEE_MS, rate: 1, boost });
  escaped.add(steer);
}

// Returns whether any fish is still fleeing.
function easeFleeRates(fishEls, now) {
  let active = false;
  for (const prey of fishEls) {
    const steer = steerOf(prey);
    const state = steer && fleeing.get(steer);
    if (!state) continue;
    const target = now < state.until ? state.boost : 1;
    state.rate += (target - state.rate) * 0.06;
    if (target === 1 && Math.abs(state.rate - 1) < 0.01) {
      state.swim.playbackRate = 1;
      fleeing.delete(steer);
      continue;
    }
    state.swim.playbackRate = state.rate;
    active = true;
  }
  return active;
}

function steerShark(shark, fishEls, dt, { eats, bounds }) {
  const steer = steerOf(shark);
  const rect = steer.getBoundingClientRect();
  const flip = Number(shark.dataset.flip);
  const heading = flip === -1 ? 1 : -1;
  const head = { x: heading > 0 ? rect.right : rect.left, y: center(rect).y };
  const state = hunters.get(steer) ?? { offset: 0, velocity: 0, target: null, rate: 1 };
  hunters.set(steer, state);

  const scareRadius = rect.width * SCARE_RADIUS + 20;
  const isAhead = (p) => {
    const ahead = (p.x - head.x) * heading;
    return ahead >= -rect.width * 0.2 && ahead <= window.innerWidth * HUNT_RANGE;
  };

  const candidates = [];
  for (const prey of fishEls) {
    const preySteer = steerOf(prey);
    if (prey === shark || !preySteer || escaped.has(preySteer)) continue;
    if (prey.classList.contains("fish-field__fish--shark")) continue;
    for (const member of membersOf(prey)) {
      const p = center(member.getBoundingClientRect());
      if (isAhead(p)) candidates.push({ prey, preySteer, member, p, distance: Math.hypot(p.x - head.x, p.y - head.y) });
    }
  }

  let locked = eats ? candidates.find((c) => c.member === state.target) : null;
  if (eats && !locked) locked = candidates.reduce((best, c) => (!best || c.distance < best.distance ? c : best), null);
  state.target = locked?.member ?? null;

  if (locked && locked.distance < rect.width * CATCH_RADIUS + 8) {
    eat(locked.prey, locked.member);
    state.target = null;
    locked = null;
  }

  let nearest = null;
  const scared = new Set();
  for (const c of candidates) {
    if (locked && c.prey === locked.prey) continue;
    if (c.distance < scareRadius) {
      if (!scared.has(c.prey)) dart(c.prey, c.preySteer, head.y, flip);
      scared.add(c.prey);
    } else if (!nearest || c.distance < nearest.distance) {
      nearest = c;
    }
  }

  const target = locked?.p ?? nearest?.p;
  const maxSpeed = locked ? DIVE_STEER_SPEED : STEER_SPEED;
  const limit = window.innerHeight * MAX_STEER;
  const targetY = target
    ? clamp(target.y, window.innerHeight * bounds.top, window.innerHeight * bounds.bottom)
    : head.y;
  const desired = clamp(state.offset + (targetY - head.y), -limit, limit);
  const wanted = clamp((desired - state.offset) * STEER_RESPONSE, -maxSpeed, maxSpeed);
  state.velocity += (wanted - state.velocity) * Math.min(1, dt * 2);
  state.offset += state.velocity * dt;

  const pitch = clamp((state.velocity / STEER_SPEED) * MAX_PITCH_DEG, -MAX_PITCH_DEG, MAX_PITCH_DEG) * heading;
  steer.style.transform = `translateY(${state.offset}px) rotate(${pitch}deg)`;

  const lunging = locked && locked.distance < rect.width * LUNGE_RANGE;
  state.rate += ((lunging ? LUNGE_BOOST : 1) - state.rate) * Math.min(1, dt * 3);
  const swim = swimAnimation(shark);
  if (swim) swim.playbackRate = state.rate;
}

function scareAhead(sub, fishEls) {
  const rect = sub.getBoundingClientRect();
  const flip = Number(sub.dataset.flip);
  const nose = { x: flip === -1 ? rect.right : rect.left, y: center(rect).y };
  const radius = rect.width * SUB_SCARE_RADIUS;
  for (const prey of fishEls) {
    const preySteer = steerOf(prey);
    if (!preySteer || escaped.has(preySteer) || prey.classList.contains("fish-field__fish--shark")) continue;
    const near = membersOf(prey).some((member) => {
      const p = center(member.getBoundingClientRect());
      return Math.hypot(p.x - nose.x, p.y - nose.y) < radius;
    });
    if (near) dart(prey, preySteer, nose.y, flip);
  }
}

// `bounds` are the top/bottom of open water as viewport-height fractions.
export function startSharkHunt(field, options) {
  let last = 0;

  function frame(now) {
    if (!field.isConnected) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;

    const fishEls = [...field.children];
    const sharks = fishEls.filter(
      (el) => el.classList.contains("fish-field__fish--shark") && isOnScreen(el.getBoundingClientRect())
    );
    sharks.forEach((shark) => steerShark(shark, fishEls, dt, options));
    const subs = fishEls.filter((el) => el.classList.contains("fish-field__sub"));
    subs.forEach((sub) => scareAhead(sub, fishEls));
    const stillFleeing = easeFleeRates(fishEls, now);

    if (sharks.length || subs.length || stillFleeing) {
      requestAnimationFrame(frame);
    } else {
      last = 0;
      setTimeout(() => requestAnimationFrame(frame), IDLE_CHECK_MS);
    }
  }

  requestAnimationFrame(frame);
}
