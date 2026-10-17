import { bounce } from "./bounce/bounce.js";
import { bubbles } from "./bubbles/bubbles.js";
import { fish } from "./fish/fish.js";
import { mountains } from "./mountains/mountains.js";
import { stratosphere } from "./stratosphere/stratosphere.js";

const none = { id: "none", label: "None", controls: [] };

export const backgrounds = [bubbles, stratosphere, mountains, fish, bounce, none];

export function findBackground(id) {
  return backgrounds.find((background) => background.id === id) ?? none;
}
