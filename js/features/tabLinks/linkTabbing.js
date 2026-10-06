import { state } from "../../state.js";

let attached = false;

function isModalOpen() {
  return [...document.querySelectorAll(".surface--modal")].some((el) => el.checkVisibility());
}

function visibleSearchInput() {
  return document.querySelector(".search-bar:not(.search-bar--hidden) .search-bar__input");
}

function linkLabels() {
  return [...document.querySelectorAll(".link-list .link-list__label")];
}

function isOtherTextField(el) {
  const typing = el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
  return typing && el !== visibleSearchInput();
}

// Tab only ever lands on link rows — everything else on the page already has its own
// keybind — and wraps around instead of escaping into the browser's address bar.
function onTab(e) {
  e.preventDefault();
  const links = linkLabels();
  if (!links.length) return;

  const index = links.indexOf(document.activeElement);
  const step = e.shiftKey ? -1 : 1;
  const next =
    index === -1
      ? links.at(e.shiftKey ? -1 : 0)
      : links[(index + step + links.length) % links.length];
  next.focus();
}

// Arrows walk the search bar (when shown) and then every link, top to bottom, stopping
// at either end rather than wrapping.
function onArrow(e) {
  const search = visibleSearchInput();
  const stops = search ? [search, ...linkLabels()] : linkLabels();
  if (!stops.length) return;
  e.preventDefault();

  const index = stops.indexOf(document.activeElement);
  if (index === -1) {
    const links = linkLabels();
    (e.key === "ArrowDown" ? links[0] : links.at(-1))?.focus();
    return;
  }
  const next = stops[index + (e.key === "ArrowDown" ? 1 : -1)];
  next?.focus();
}

export function initLinkTabbing() {
  if (attached) return;
  attached = true;
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isModalOpen()) return;

    if (e.key === "Tab") {
      onTab(e);
    } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !e.shiftKey) {
      if (isOtherTextField(e.target)) return;
      if (state.links.some((l) => l.shortcutKey === e.key)) return;
      onArrow(e);
    }
  });
}
