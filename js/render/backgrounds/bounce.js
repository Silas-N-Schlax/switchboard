import {
  bounceDefaultSize,
  bounceCountMin,
  bounceLogoWidthRange,
  bounceBaseSpeed,
  bounceCornerSpeedup,
  bounceTerminalMultiple,
  bounceCornerTolerancePx,
  bounceRespawnDelayMs,
  bounceGravity,
  backgroundSizeMin,
} from "../../../defaults.js";
import { state } from "../../state.js";
import { prefersReducedMotion, randomBetween, randomInRange, animationDone } from "./util.js";
import { bounceLogos, faviconArt } from "./bounceLogos.js";
import { countCorner } from "./bounceStats.js";

const BRIGHT_COLORS = ["#ff4d6d", "#ffd166", "#06d6a0", "#4cc9f0", "#b388ff", "#ff9f1c", "#f72585"];
const MUTED_LIGHTEN = 0.55;
const CONFETTI_COUNT = 40;
const CONFETTI_MS = 1900;
// A wall hit right after a corner hit is the same corner, not a second one.
const CORNER_COOLDOWN_MS = 600;
const FALL_BOUNCE_DAMPING = 0.55;
const MAX_STEP_S = 0.05;
const TRAIL_GHOSTS = 4;
const TRAIL_SPACING_FRAMES = 3;
const TRAIL_MAX_OPACITY = 0.4;

function lighten(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c + (255 - c) * amount));
  return `rgb(${channels.join(", ")})`;
}

function mutedPalette(colors) {
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  return [...new Set(colors.map((color) => lighten(color, MUTED_LIGHTEN))), ...(accent ? [accent] : [])];
}

function logoWidth(sizeMultiplier) {
  const t = (sizeMultiplier - backgroundSizeMin) / (1 - backgroundSizeMin);
  return bounceLogoWidthRange.min + t * (bounceLogoWidthRange.max - bounceLogoWidthRange.min);
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomSign() {
  return Math.random() < 0.5 ? -1 : 1;
}

function confettiKeyframes(cornerX, cornerY) {
  const angle = randomBetween(10, 80) * (Math.PI / 180);
  const speed = randomBetween(500, 1200);
  const vx = Math.cos(angle) * speed * (cornerX === "left" ? 1 : -1);
  const vy = Math.sin(angle) * speed * (cornerY === "top" ? 1 : -1);
  const spin = randomBetween(-720, 720);
  const seconds = CONFETTI_MS / 1000;
  return Array.from({ length: 7 }, (_, i) => {
    const t = (i / 6) * seconds;
    const x = vx * t;
    const y = vy * t + 0.5 * bounceGravity * t * t;
    return {
      transform: `translate(${x}px, ${y}px) rotate(${(spin * i) / 6}deg)`,
      opacity: i < 4 ? 1 : 1 - (i - 3) / 3,
    };
  });
}

function burstConfetti(ctx, cornerX, cornerY, terminal) {
  const burst = document.createElement("div");
  burst.className = `bounce-field__burst bounce-field__burst--${cornerY}-${cornerX}`;

  const animations = [];
  for (let i = 0; i < CONFETTI_COUNT * (terminal ? 2 : 1); i++) {
    const piece = document.createElement("div");
    piece.className = "bounce-field__confetti";
    piece.style.background = ctx.palette[i % ctx.palette.length];
    piece.style.width = `${randomBetween(6, 12)}px`;
    piece.style.height = `${randomBetween(4, 8)}px`;
    burst.appendChild(piece);
    animations.push(
      piece.animate(confettiKeyframes(cornerX, cornerY), { duration: CONFETTI_MS, easing: "linear", fill: "forwards" })
    );
  }

  ctx.field.appendChild(burst);
  Promise.all(animations.map(animationDone)).then(() => burst.remove());
}

function buildGhosts(ctx, art) {
  if (!ctx.speedUp) return [];
  return Array.from({ length: TRAIL_GHOSTS }, () => {
    const ghost = document.createElement("div");
    ghost.className = "bounce-field__ghost";
    ghost.appendChild(art.cloneNode(true));
    return ghost;
  });
}

function createLogo(ctx, index) {
  const { art, aspect, scale, glow, followsTab } = ctx.logo.build(index);
  const el = document.createElement("div");
  el.className = glow ? "bounce-field__logo bounce-field__logo--glow" : "bounce-field__logo";
  el.appendChild(art);
  const w = ctx.width * scale;
  const h = w * aspect;
  const ghosts = buildGhosts(ctx, art);
  for (const part of [...ghosts, el]) {
    part.style.width = `${w}px`;
    part.style.height = `${h}px`;
    ctx.field.appendChild(part);
  }

  const logo = {
    index,
    el,
    ghosts,
    followsTab,
    trail: [],
    w,
    h,
    x: randomBetween(0, Math.max(0, window.innerWidth - w)),
    y: randomBetween(0, Math.max(0, window.innerHeight - h)),
    dx: randomSign(),
    dy: randomSign(),
    vy: 0,
    multiple: 1,
    atTerminal: false,
    phase: "bouncing",
    color: null,
    lastCornerAt: -Infinity,
    respawnAt: 0,
  };
  recolor(ctx, logo);
  place(logo);
  return logo;
}

function swapArt(logo, index) {
  const art = faviconArt(index);
  logo.el.replaceChildren(art);
  logo.ghosts.forEach((ghost) => ghost.replaceChildren(art.cloneNode(true)));
}

function recolor(ctx, logo) {
  const options = ctx.palette.filter((color) => color !== logo.color);
  logo.color = pick(options.length ? options : ctx.palette);
  for (const part of [logo.el, ...logo.ghosts]) part.style.color = logo.color;
}

function place(logo) {
  logo.el.style.transform = `translate3d(${logo.x}px, ${logo.y}px, 0)`;
}

function placeTrail(ctx, logo) {
  if (!logo.ghosts.length) return;
  logo.trail.push({ x: logo.x, y: logo.y });
  if (logo.trail.length > TRAIL_GHOSTS * TRAIL_SPACING_FRAMES + 1) logo.trail.shift();
  const intensity =
    logo.phase === "gone" ? 0 : Math.min(1, (logo.multiple - 1) / (bounceTerminalMultiple - 1));
  logo.ghosts.forEach((ghost, i) => {
    const point = logo.trail[logo.trail.length - 1 - (i + 1) * TRAIL_SPACING_FRAMES] ?? logo;
    ghost.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
    ghost.style.opacity = String(intensity * TRAIL_MAX_OPACITY * (1 - i / TRAIL_GHOSTS));
  });
}

function nearestCorner(logo, maxX, maxY) {
  return {
    cornerX: logo.x < maxX / 2 ? "left" : "right",
    cornerY: logo.y < maxY / 2 ? "top" : "bottom",
  };
}

function hitCorner(ctx, logo, maxX, maxY) {
  if (ctx.speedUp) logo.multiple = Math.min(bounceTerminalMultiple, logo.multiple * bounceCornerSpeedup);
  const terminal = ctx.speedUp && logo.multiple >= bounceTerminalMultiple;
  const firstTerminal = terminal && !logo.atTerminal;
  logo.atTerminal = terminal;
  countCorner({ terminal: firstTerminal });

  const { cornerX, cornerY } = nearestCorner(logo, maxX, maxY);
  if (ctx.confetti) burstConfetti(ctx, cornerX, cornerY, firstTerminal);
  if (!terminal || !ctx.escape) return false;
  logo.phase = "escaping";
  logo.dx = cornerX === "left" ? -1 : 1;
  logo.dy = cornerY === "top" ? -1 : 1;
  return true;
}

function stepBouncing(ctx, logo, dt, now) {
  const speed = ctx.baseSpeed * logo.multiple;
  logo.x += logo.dx * speed * dt;
  logo.y += logo.dy * speed * dt;

  const maxX = Math.max(0, window.innerWidth - logo.w);
  const maxY = Math.max(0, window.innerHeight - logo.h);
  const hitX = logo.x <= 0 || logo.x >= maxX;
  const hitY = logo.y <= 0 || logo.y >= maxY;
  if (!hitX && !hitY) return;

  const nearX = logo.x <= ctx.tolerance || logo.x >= maxX - ctx.tolerance;
  const nearY = logo.y <= ctx.tolerance || logo.y >= maxY - ctx.tolerance;
  if (nearX && nearY && now - logo.lastCornerAt > CORNER_COOLDOWN_MS) {
    logo.lastCornerAt = now;
    if (hitCorner(ctx, logo, maxX, maxY)) return;
  }

  if (hitX) {
    logo.x = Math.min(maxX, Math.max(0, logo.x));
    logo.dx = logo.x <= 0 ? 1 : -1;
  }
  if (hitY) {
    logo.y = Math.min(maxY, Math.max(0, logo.y));
    logo.dy = logo.y <= 0 ? 1 : -1;
  }
  recolor(ctx, logo);
}

function stepEscaping(ctx, logo, dt, now) {
  const speed = ctx.baseSpeed * logo.multiple;
  logo.x += logo.dx * speed * dt;
  logo.y += logo.dy * speed * dt;
  const gone =
    logo.x < -logo.w || logo.x > window.innerWidth || logo.y < -logo.h || logo.y > window.innerHeight;
  if (!gone) return;
  logo.phase = "gone";
  logo.el.hidden = true;
  logo.respawnAt = now + randomInRange(bounceRespawnDelayMs);
}

function respawn(ctx, logo, now) {
  if (now < logo.respawnAt) return;
  logo.phase = "falling";
  logo.multiple = 1;
  logo.atTerminal = false;
  logo.trail = [];
  logo.x = randomBetween(0, Math.max(0, window.innerWidth - logo.w));
  logo.y = -logo.h;
  logo.vy = 0;
  logo.dx = randomSign();
  logo.el.hidden = false;
  recolor(ctx, logo);
}

// Drops in from above and settles, then hands back to the classic diagonal bounce.
function stepFalling(ctx, logo, dt) {
  logo.vy += bounceGravity * dt;
  logo.y += logo.vy * dt;
  logo.x += logo.dx * ctx.baseSpeed * dt;

  const maxX = Math.max(0, window.innerWidth - logo.w);
  const maxY = Math.max(0, window.innerHeight - logo.h);
  if (logo.x <= 0 || logo.x >= maxX) {
    logo.x = Math.min(maxX, Math.max(0, logo.x));
    logo.dx = logo.x <= 0 ? 1 : -1;
  }
  if (logo.y < maxY) return;
  logo.y = maxY;
  logo.vy = -logo.vy * FALL_BOUNCE_DAMPING;
  recolor(ctx, logo);
  if (Math.abs(logo.vy) < ctx.baseSpeed * 1.2) {
    logo.phase = "bouncing";
    logo.dy = -1;
  }
}

// Pushes overlapping logos apart along whichever axis they overlap least, sending each
// away from the other.
function collide(ctx, a, b) {
  const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (overlapX <= 0 || overlapY <= 0) return;
  if (overlapX < overlapY) {
    const [left, right] = a.x < b.x ? [a, b] : [b, a];
    left.x -= overlapX / 2;
    right.x += overlapX / 2;
    left.dx = -1;
    right.dx = 1;
  } else {
    const [top, bottom] = a.y < b.y ? [a, b] : [b, a];
    top.y -= overlapY / 2;
    bottom.y += overlapY / 2;
    top.dy = -1;
    bottom.dy = 1;
  }
  recolor(ctx, a);
  recolor(ctx, b);
}

function collideAll(ctx, logos) {
  const bouncing = logos.filter((logo) => logo.phase === "bouncing");
  for (let i = 0; i < bouncing.length; i++) {
    for (let j = i + 1; j < bouncing.length; j++) collide(ctx, bouncing[i], bouncing[j]);
  }
}

export const bounce = {
  id: "bounce",
  label: "Bounce",
  controls: ["count", "size", "speed"],
  countMin: bounceCountMin,
  selects: [
    {
      key: "logo",
      label: "Logo",
      options: Object.entries(bounceLogos).map(([value, { label }]) => ({ value, label })),
    },
  ],
  frequencySliders: [{ key: "cornerLuck", label: "Corner luck" }],
  toggles: [
    { key: "speedUp", label: "Speed up on corners" },
    { key: "escape", label: "Escape at top speed" },
    { key: "confetti", label: "Confetti" },
    { key: "collide", label: "Bounce off each other" },
    { key: "muted", label: "Muted colors" },
  ],
  create(container, { count, sizeMultiplier, speedMultiplier, settings, colors }) {
    const field = document.createElement("div");
    field.className = settings.muted ? "bounce-field bounce-field--muted" : "bounce-field";
    container.appendChild(field);

    const ctx = {
      field,
      logo: bounceLogos[settings.logo] ?? bounceLogos.disc,
      width: logoWidth(sizeMultiplier ?? bounceDefaultSize),
      palette: settings.muted ? mutedPalette(colors) : BRIGHT_COLORS,
      baseSpeed: bounceBaseSpeed * speedMultiplier,
      tolerance: bounceCornerTolerancePx * (settings.cornerLuck ?? 1),
      speedUp: settings.speedUp ?? true,
      escape: settings.escape ?? true,
      confetti: settings.confetti ?? true,
    };
    const logos = Array.from({ length: count }, (_, index) => createLogo(ctx, index));
    if (prefersReducedMotion) return field;

    let tabId = state.activeTabId;
    let last = performance.now();
    function frame(now) {
      if (!field.isConnected) return;
      const dt = Math.min(MAX_STEP_S, (now - last) / 1000);
      last = now;
      if (tabId !== state.activeTabId) {
        tabId = state.activeTabId;
        logos.filter((logo) => logo.followsTab).forEach((logo) => swapArt(logo, logo.index));
      }
      for (const logo of logos) {
        if (logo.phase === "bouncing") stepBouncing(ctx, logo, dt, now);
        else if (logo.phase === "escaping") stepEscaping(ctx, logo, dt, now);
        else if (logo.phase === "gone") respawn(ctx, logo, now);
        else stepFalling(ctx, logo, dt);
      }
      if (settings.collide) collideAll(ctx, logos);
      for (const logo of logos) {
        if (logo.phase !== "gone") place(logo);
        placeTrail(ctx, logo);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return field;
  },
};
