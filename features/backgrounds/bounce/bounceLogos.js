import { state } from "../../../core/state.js";
import { buildFavicon } from "../../favicons/favicon.js";
import { svgEl } from "../shared/util.js";

function buildDisc() {
  const svg = svgEl("svg", { viewBox: "0 0 200 120", "aria-hidden": "true" });
  const title = svgEl("text", { x: 100, y: 66, class: "bounce-field__disc-title" });
  title.textContent = "DVD";
  const disc = svgEl("ellipse", { cx: 100, cy: 96, rx: 86, ry: 17, fill: "currentColor" });
  const label = svgEl("text", { x: 100, y: 101, class: "bounce-field__disc-label" });
  label.textContent = "VIDEO";
  svg.append(title, disc, label);
  return { art: svg, aspect: 120 / 200, scale: 1 };
}

function buildToaster() {
  const svg = svgEl("svg", { viewBox: "0 0 140 100", "aria-hidden": "true" });
  const wingBack = svgEl("path", {
    class: "bounce-field__wing bounce-field__wing--back",
    d: "M46 40 C 30 10, 6 8, 2 20 C 14 22, 22 30, 26 44 Z",
  });
  const toast = svgEl("rect", { x: 52, y: 14, width: 30, height: 26, rx: 8, class: "bounce-field__toast" });
  const body = svgEl("rect", { x: 30, y: 30, width: 96, height: 60, rx: 18, fill: "currentColor" });
  const slot = svgEl("rect", { x: 48, y: 36, width: 38, height: 6, rx: 3, class: "bounce-field__toaster-slot" });
  const lever = svgEl("rect", { x: 112, y: 50, width: 18, height: 7, rx: 3.5, fill: "currentColor" });
  const wingFront = svgEl("path", {
    class: "bounce-field__wing",
    d: "M54 48 C 40 16, 14 12, 8 26 C 22 28, 30 38, 34 54 Z",
  });
  svg.append(wingBack, toast, body, slot, lever, wingFront);
  return { art: svg, aspect: 100 / 140, scale: 0.8 };
}

function markImage() {
  const img = document.createElement("img");
  img.src = "graphics/svg/switchboard-mark.svg";
  img.alt = "";
  img.draggable = false;
  return img;
}

function buildMark() {
  return { art: markImage(), aspect: 1, scale: 0.55, glow: true };
}

function activeTabUrls() {
  const urls = state.links.filter((link) => link.tabId === state.activeTabId).map((link) => link.url);
  return [...new Set(urls.filter(Boolean))];
}

// The mark stands in on a tab with no links, at favicon size so logos don't resize on a tab switch.
export function faviconArt(index) {
  const urls = activeTabUrls();
  if (!urls.length) return markImage();
  return buildFavicon(urls[index % urls.length], "bounce-field__favicon");
}

function buildFavicons(index) {
  return { art: faviconArt(index), aspect: 1, scale: 0.45, glow: true, followsTab: true };
}

export const bounceLogos = {
  disc: { label: "Disc", build: buildDisc },
  toaster: { label: "Flying toaster", build: buildToaster },
  mark: { label: "Switchboard", build: buildMark },
  favicons: { label: "Your favicons", build: buildFavicons },
};
