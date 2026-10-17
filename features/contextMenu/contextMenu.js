import { buildShortcutBadges } from "../../shared/keybinds/shortcutBadges.js";
import { matchesKeybind } from "../../shared/keybinds/registry.js";

let openMenuEl = null;
let returnFocusEl = null;

// Cleared before removal: removing a menu that holds focus fires its focusout handler.
function closeMenu() {
  const menu = openMenuEl;
  openMenuEl = null;
  returnFocusEl = null;
  menu?.remove();
}

function closeAndReturnFocus() {
  const target = returnFocusEl;
  closeMenu();
  if (target?.isConnected) target.focus();
}

function enabledItems() {
  return [...openMenuEl.querySelectorAll(".context-menu__item:not(:disabled)")];
}

// Contains every key, like a modal, so app keybinds and the page's own arrow navigation
// can't act behind the menu. Enter and Space still click the focused item natively.
function onMenuKeyDown(e) {
  e.stopPropagation();
  if (e.key === "Escape" || e.key === "Tab" || matchesKeybind(e, "context-menu-open")) {
    e.preventDefault();
    closeAndReturnFocus();
    return;
  }
  const items = enabledItems();
  const index = items.indexOf(document.activeElement);
  let next = null;
  if (e.key === "ArrowDown") next = items[(index + 1) % items.length];
  else if (e.key === "ArrowUp") next = items[(index - 1 + items.length) % items.length];
  else if (e.key === "Home") next = items[0];
  else if (e.key === "End") next = items.at(-1);
  if (!next) return;
  e.preventDefault();
  next.focus();
}

document.addEventListener("click", (e) => {
  if (openMenuEl && !openMenuEl.contains(e.target)) closeMenu();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});
document.addEventListener("scroll", closeMenu, true);
window.addEventListener("blur", closeMenu);

// With `returnFocus`, the menu was opened from the keyboard: it takes focus, and gives it
// back to that element once it closes.
export function openContextMenu(x, y, items, { returnFocus = null } = {}) {
  closeMenu();
  if (!items.length) return;

  const menu = document.createElement("div");
  menu.className = "context-menu surface";
  menu.setAttribute("role", "menu");

  items.forEach((item) => {
    if (item.divider) {
      const divider = document.createElement("div");
      divider.className = "context-menu__divider";
      menu.appendChild(divider);
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "context-menu__item";
    button.setAttribute("role", "menuitem");
    if (item.danger) button.classList.add("context-menu__item--danger");
    const label = document.createElement("span");
    label.className = "context-menu__label";
    label.textContent = item.label;
    button.appendChild(label);
    if (item.hint) button.appendChild(buildShortcutBadges(item.hint));
    button.disabled = !!item.disabled;
    button.addEventListener("click", () => {
      closeAndReturnFocus();
      item.onSelect?.();
    });
    menu.appendChild(button);
  });

  document.body.appendChild(menu);

  const rect = menu.getBoundingClientRect();
  const left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;

  openMenuEl = menu;
  if (returnFocus) {
    returnFocusEl = returnFocus;
    menu.addEventListener("keydown", onMenuKeyDown);
    menu.addEventListener("focusout", (e) => {
      if (openMenuEl === menu && !menu.contains(e.relatedTarget)) closeMenu();
    });
    enabledItems()[0]?.focus();
  }
}

export function closeContextMenu() {
  closeMenu();
}
