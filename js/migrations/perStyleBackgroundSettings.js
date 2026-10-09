import { withAmbientMode, withoutUndefined } from "./helpers.js";

const LEGACY_KEYS = [
  "bubbleCount",
  "bubbleSizeMultiplier",
  "fishSizeMultiplier",
  "bubbleSpeedMultiplier",
  "sharkEats",
  "seaFloor",
  "seaSurface",
];

// Before per-style settings, count and speed were shared by every style and only fish
// kept its own size; each style inherits what it was effectively using.
export function perStyleBackgroundSettings(raw) {
  const ambient = raw.settings?.ambientMode;
  if (!ambient || !LEGACY_KEYS.some((key) => key in ambient)) return raw;

  const {
    bubbleCount,
    bubbleSizeMultiplier,
    fishSizeMultiplier,
    bubbleSpeedMultiplier,
    sharkEats,
    seaFloor,
    seaSurface,
    backgroundStyles = {},
    ...rest
  } = ambient;
  const shared = { count: bubbleCount, speed: bubbleSpeedMultiplier };
  const legacyStyles = {
    bubbles: { ...shared, size: bubbleSizeMultiplier },
    fish: { ...shared, size: fishSizeMultiplier, sharkEats, seaFloor, seaSurface },
    mountains: { speed: bubbleSpeedMultiplier },
  };

  const styles = { ...backgroundStyles };
  for (const [id, legacy] of Object.entries(legacyStyles)) {
    styles[id] = { ...withoutUndefined(legacy), ...backgroundStyles[id] };
  }
  return withAmbientMode(raw, { ...rest, backgroundStyles: styles });
}
