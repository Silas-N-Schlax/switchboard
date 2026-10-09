import { withAmbientMode } from "./helpers.js";

// Pre-picker saves only had a bubblesEnabled flag.
export function backgroundPicker(raw) {
  const ambient = raw.settings?.ambientMode;
  if (!ambient || !("bubblesEnabled" in ambient)) return raw;

  const { bubblesEnabled, ...rest } = ambient;
  return withAmbientMode(raw, bubblesEnabled === false ? { backgroundType: "none", ...rest } : rest);
}
