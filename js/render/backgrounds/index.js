import { bubbles } from "./bubbles.js";
import { fish } from "./fish.js";
import { mountains } from "./mountains.js";

const none = { id: "none", label: "None", controls: [] };

export const backgrounds = [bubbles, fish, mountains, none];

// Styles can keep their own size value (`sizeSetting`); the rest share bubbleSizeMultiplier.
export function sizeSettingKey(background) {
  return background.sizeSetting ?? "bubbleSizeMultiplier";
}

export function findBackground(id) {
  return backgrounds.find((background) => background.id === id) ?? none;
}
