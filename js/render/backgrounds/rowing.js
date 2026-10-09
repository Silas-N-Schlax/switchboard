// The rowboat's rower, in the boat's viewBox (y=0 is the waterline, bow to the right).
// One stroke is a smooth function of phase; it's sampled into keyframes for the oar,
// torso and two-part arm, and the arm is solved to the handle so the hand never slips.
import { svgEl } from "./util.js";

export const STROKE_MS = 2400;
const SAMPLES = 48;
const DRIVE_SHARE = 0.5;
const CATCH_BLEND = 0.07;

const OARLOCK = { x: 44, y: -6 };
const HANDLE_LENGTH = 12;
const BLADE_LENGTH = 40;
const SWEEP_DEG = 35;
// The oar mostly points out toward the viewer, so it's drawn foreshortened: steep while
// the blade is buried, nearly end-on once it's lifted clear for the recovery.
const BURIED_DEG = 50;
const LIFTED_DEG = 4;

const HIP = { x: 59, y: -4 };
const TORSO_LENGTH = 10;
const ARM_SEGMENT = 9;
const LEAN_AT_CATCH_DEG = -25;
const LEAN_AT_FINISH_DEG = 12;

const rad = (deg) => (deg * Math.PI) / 180;
const deg = (rad) => (rad * 180) / Math.PI;
const smoothstep = (from, to, x) => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

function bladeWetness(phase) {
  const t = phase < (1 + DRIVE_SHARE) / 2 ? phase : phase - 1;
  return (
    smoothstep(-CATCH_BLEND, CATCH_BLEND, t) * (1 - smoothstep(DRIVE_SHARE - CATCH_BLEND, DRIVE_SHARE + CATCH_BLEND, t))
  );
}

export function bladeIsWet(elapsedMs) {
  return bladeWetness((elapsedMs % STROKE_MS) / STROKE_MS) > 0.5;
}

// CSS rotate(a) turns the downward rest pose (0, 1) to (-sin a, cos a).
const angleOf = (dx, dy) => deg(Math.atan2(-dx, dy));

function reach(shoulder, hand) {
  const dx = hand.x - shoulder.x;
  const dy = hand.y - shoulder.y;
  const span = Math.min(Math.hypot(dx, dy), ARM_SEGMENT * 2 - 0.01);
  const toward = Math.atan2(dy, dx);
  const bend = Math.acos(span / (ARM_SEGMENT * 2));
  const elbows = [toward - bend, toward + bend].map((a) => ({
    x: shoulder.x + ARM_SEGMENT * Math.cos(a),
    y: shoulder.y + ARM_SEGMENT * Math.sin(a),
  }));
  const elbow = elbows[0].y > elbows[1].y ? elbows[0] : elbows[1];
  return {
    upper: angleOf(elbow.x - shoulder.x, elbow.y - shoulder.y),
    fore: angleOf(hand.x - elbow.x, hand.y - elbow.y),
  };
}

function pose(phase) {
  const sweep =
    phase < DRIVE_SHARE
      ? SWEEP_DEG * Math.cos((Math.PI * phase) / DRIVE_SHARE)
      : -SWEEP_DEG * Math.cos((Math.PI * (phase - DRIVE_SHARE)) / (1 - DRIVE_SHARE));
  const dip = LIFTED_DEG + (BURIED_DEG - LIFTED_DEG) * bladeWetness(phase);
  const along = { x: Math.sin(rad(sweep)) * Math.cos(rad(dip)), y: Math.sin(rad(dip)) };

  const lean = LEAN_AT_FINISH_DEG + ((LEAN_AT_CATCH_DEG - LEAN_AT_FINISH_DEG) * (sweep / SWEEP_DEG + 1)) / 2;
  const shoulder = {
    x: HIP.x + TORSO_LENGTH * Math.sin(rad(lean)),
    y: HIP.y - TORSO_LENGTH * Math.cos(rad(lean)),
  };
  const hand = { x: OARLOCK.x - HANDLE_LENGTH * along.x, y: OARLOCK.y - HANDLE_LENGTH * along.y };
  const arm = reach(shoulder, hand);

  return {
    oar: `rotate(${angleOf(along.x, along.y)}deg) scaleY(${Math.hypot(along.x, along.y)})`,
    torso: `rotate(${lean}deg)`,
    upperArm: `rotate(${arm.upper - lean}deg)`,
    forearm: `rotate(${arm.fore - arm.upper}deg)`,
  };
}

function jointed(pivot, ...children) {
  const group = svgEl("g", { class: "sea-surface__joint" });
  group.style.transformOrigin = `${pivot.x}px ${pivot.y}px`;
  group.append(...children);
  return group;
}

export function rowerParts() {
  const shoulder = { x: HIP.x, y: HIP.y - TORSO_LENGTH };
  const elbow = { x: shoulder.x, y: shoulder.y + ARM_SEGMENT };
  const hand = { x: elbow.x, y: elbow.y + ARM_SEGMENT };

  const oar = jointed(
    OARLOCK,
    svgEl("rect", {
      x: OARLOCK.x - 0.8,
      y: OARLOCK.y - HANDLE_LENGTH,
      width: 1.6,
      height: HANDLE_LENGTH + BLADE_LENGTH - 10,
    }),
    svgEl("path", {
      "data-wake": "",
      d: `M41 ${OARLOCK.y + BLADE_LENGTH - 13} L47 ${OARLOCK.y + BLADE_LENGTH - 13} L46.5 ${OARLOCK.y + BLADE_LENGTH - 3} Q44 ${OARLOCK.y + BLADE_LENGTH} 41.5 ${OARLOCK.y + BLADE_LENGTH - 3} Z`,
    })
  );
  const forearm = jointed(
    elbow,
    svgEl("rect", { x: elbow.x - 1.1, y: elbow.y - 0.8, width: 2.2, height: ARM_SEGMENT + 0.8, rx: 1.1 }),
    svgEl("circle", { cx: hand.x, cy: hand.y, r: 1.4 })
  );
  const upperArm = jointed(
    shoulder,
    svgEl("rect", { x: shoulder.x - 1.3, y: shoulder.y - 1, width: 2.6, height: ARM_SEGMENT + 1, rx: 1.3 }),
    forearm
  );
  const torso = jointed(
    HIP,
    svgEl("path", { d: `M${HIP.x - 2.6} ${HIP.y} L${HIP.x - 1.6} ${shoulder.y + 1} Q${HIP.x} ${shoulder.y - 1.6} ${HIP.x + 1.8} ${shoulder.y + 1} L${HIP.x + 3} ${HIP.y} Z` }),
    svgEl("circle", { cx: HIP.x - 0.4, cy: shoulder.y - 4, r: 3 }),
    upperArm
  );

  const frames = Array.from({ length: SAMPLES + 1 }, (_, i) => pose(i / SAMPLES));
  const timing = { duration: STROKE_MS, iterations: Infinity };
  for (const [el, key] of [
    [oar, "oar"],
    [torso, "torso"],
    [upperArm, "upperArm"],
    [forearm, "forearm"],
  ]) {
    el.animate(frames.map((frame) => ({ transform: frame[key] })), timing);
  }
  return [oar, torso];
}
