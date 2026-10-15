import { recordEvent, StatEvent } from "../../features/stats/recorder.js";

const FLUSH_INTERVAL_MS = 30000;
const pending = { corners: 0, terminal: 0 };
let flushing = false;

// Corner hits can come every second at high Corner luck, so they're batched into one
// stats event per flush instead of one event per hit.
export function flushCornerCounts() {
  if (!pending.corners && !pending.terminal) return Promise.resolve();
  const written = recordEvent(StatEvent.bounceCorners, { ...pending });
  pending.corners = 0;
  pending.terminal = 0;
  return written;
}

function startFlushing() {
  if (flushing) return;
  flushing = true;
  setInterval(flushCornerCounts, FLUSH_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushCornerCounts();
  });
  window.addEventListener("pagehide", flushCornerCounts);
}

export function countCorner({ terminal }) {
  startFlushing();
  pending.corners += 1;
  if (terminal) pending.terminal += 1;
}
