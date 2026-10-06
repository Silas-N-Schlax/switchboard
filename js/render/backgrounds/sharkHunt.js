// While a shark is on screen it bends its path toward the nearest fish ahead of it, and
// fish near its head dart away (always escaping). Everything rides on each fish's
// .fish-field__steer layer, on top of the CSS swim, so nothing runs without a shark.

const IDLE_CHECK_MS = 500;
const HUNT_RANGE = 0.4; // fraction of viewport width ahead of the shark's head
const MAX_STEER = 0.28; // fraction of viewport height the shark may bend off its line
const STEER_SPEED = 70; // px/s
const STEER_RESPONSE = 1.6; // how quickly steering velocity follows the target
const MAX_PITCH_DEG = 10;
const SCARE_RADIUS = 0.35; // fraction of shark length, measured from its head
const DART_RANGE = [0.04, 0.08]; // fraction of viewport height
const DART_MS = 1400;
const FLEE_BOOST = 2.4;
const FLEE_MS = 1800;

// Keyed by the steer layer, which is rebuilt on every respawn, so state never leaks
// into a fish's next life.
const fleeing = new WeakMap(); // steer -> { prey, swim, until, rate, boost }
const escaped = new WeakSet(); // steer
const hunters = new WeakMap(); // steer -> { offset, velocity }

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

function dart(prey, steer, sharkY, sharkFlip) {
  const preyY = center(steer.getBoundingClientRect()).y;
  const away = preyY === sharkY ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(preyY - sharkY);
  const amount = window.innerHeight * (DART_RANGE[0] + Math.random() * (DART_RANGE[1] - DART_RANGE[0]));
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

function steerShark(shark, fishEls, dt) {
  const steer = steerOf(shark);
  const rect = steer.getBoundingClientRect();
  const flip = Number(shark.dataset.flip);
  const heading = flip === -1 ? 1 : -1;
  const head = { x: heading > 0 ? rect.right : rect.left, y: center(rect).y };
  const state = hunters.get(steer) ?? { offset: 0, velocity: 0 };
  hunters.set(steer, state);

  let target = null;
  let best = Infinity;
  for (const prey of fishEls) {
    const preySteer = steerOf(prey);
    if (prey === shark || !preySteer || escaped.has(preySteer)) continue;
    if (prey.classList.contains("fish-field__fish--shark")) continue;
    const p = center(preySteer.getBoundingClientRect());
    const ahead = (p.x - head.x) * heading;
    if (ahead < -rect.width * 0.2 || ahead > window.innerWidth * HUNT_RANGE) continue;
    const distance = Math.hypot(p.x - head.x, p.y - head.y);
    if (distance < rect.width * SCARE_RADIUS + 20) {
      dart(prey, preySteer, head.y, flip);
      continue;
    }
    if (distance < best) {
      best = distance;
      target = p;
    }
  }

  const limit = window.innerHeight * MAX_STEER;
  const margin = window.innerHeight * 0.08;
  const targetY = target ? clamp(target.y, margin, window.innerHeight - margin) : head.y;
  const desired = clamp(state.offset + (targetY - head.y), -limit, limit);
  const wanted = clamp((desired - state.offset) * STEER_RESPONSE, -STEER_SPEED, STEER_SPEED);
  state.velocity += (wanted - state.velocity) * Math.min(1, dt * 2);
  state.offset += state.velocity * dt;

  const pitch = clamp((state.velocity / STEER_SPEED) * MAX_PITCH_DEG, -MAX_PITCH_DEG, MAX_PITCH_DEG) * heading;
  steer.style.transform = `translateY(${state.offset}px) rotate(${pitch}deg)`;
}

export function startSharkHunt(field) {
  let last = 0;

  function frame(now) {
    if (!field.isConnected) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;

    const fishEls = [...field.children];
    const sharks = fishEls.filter(
      (el) => el.classList.contains("fish-field__fish--shark") && isOnScreen(el.getBoundingClientRect())
    );
    sharks.forEach((shark) => steerShark(shark, fishEls, dt));
    const stillFleeing = easeFleeRates(fishEls, now);

    if (sharks.length || stillFleeing) {
      requestAnimationFrame(frame);
    } else {
      last = 0;
      setTimeout(() => requestAnimationFrame(frame), IDLE_CHECK_MS);
    }
  }

  requestAnimationFrame(frame);
}
