let openMenuEl = null;

function closeMenu() {
  openMenuEl?.remove();
  openMenuEl = null;
}

document.addEventListener("click", (e) => {
  if (openMenuEl && !openMenuEl.contains(e.target)) closeMenu();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});
document.addEventListener("scroll", closeMenu, true);
window.addEventListener("blur", closeMenu);

export function openContextMenu(x, y, items) {
  closeMenu();
  if (!items.length) return;

  const menu = document.createElement("div");
  menu.className = "context-menu surface";

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
    button.textContent = item.label;
    button.disabled = !!item.disabled;
    button.addEventListener("click", () => {
      closeMenu();
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
}

export function closeContextMenu() {
  closeMenu();
}
