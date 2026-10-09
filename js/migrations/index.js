import { backgroundPicker } from "./backgroundPicker.js";
import { perStyleBackgroundSettings } from "./perStyleBackgroundSettings.js";

// Run in order on every load, so each must leave already-migrated data untouched.
const migrations = [backgroundPicker, perStyleBackgroundSettings];

export function migrate(raw) {
  return migrations.reduce((data, migration) => migration(data), raw);
}
