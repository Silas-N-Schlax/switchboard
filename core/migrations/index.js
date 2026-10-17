import { backgroundPicker } from "./backgroundPicker.js";
import { perStyleBackgroundSettings } from "./perStyleBackgroundSettings.js";
import { platformModifierKeybinds } from "./platformModifierKeybinds.js";
import { homeLinks } from "./homeLinks.js";

// Run in order on every load, so each must leave already-migrated data untouched.
const migrations = [backgroundPicker, perStyleBackgroundSettings, platformModifierKeybinds, homeLinks];

export function migrate(raw) {
  return migrations.reduce((data, migration) => migration(data), raw);
}
