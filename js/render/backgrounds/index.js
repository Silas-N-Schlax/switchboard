import { bubbles } from "./bubbles.js";
import { fish } from "./fish.js";
import { mountains } from "./mountains.js";
import { stratosphere } from "./stratosphere.js";

const none = { id: "none", label: "None", controls: [] };

export const backgrounds = [bubbles, stratosphere, mountains, fish, none];

export function findBackground(id) {
  return backgrounds.find((background) => background.id === id) ?? none;
}
