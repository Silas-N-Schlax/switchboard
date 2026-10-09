import { bubbles } from "./bubbles.js";
import { fish } from "./fish.js";
import { mountains } from "./mountains.js";

const none = { id: "none", label: "None", controls: [] };

export const backgrounds = [bubbles, fish, mountains, none];

export function findBackground(id) {
  return backgrounds.find((background) => background.id === id) ?? none;
}
