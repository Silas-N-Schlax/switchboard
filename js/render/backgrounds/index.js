import { bubbles } from "./bubbles.js";
import { fish } from "./fish.js";

const none = { id: "none", label: "None", controls: [] };

export const backgrounds = [bubbles, fish, none];

export function findBackground(id) {
  return backgrounds.find((background) => background.id === id) ?? none;
}
