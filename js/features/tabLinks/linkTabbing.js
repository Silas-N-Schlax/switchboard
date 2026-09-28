let attached = false;

function isModalOpen() {
  return [...document.querySelectorAll(".surface--modal")].some((el) => el.checkVisibility());
}

// Tab only ever lands on link rows — everything else on the page already has its own
// keybind — and wraps around instead of escaping into the browser's address bar.
export function initLinkTabbing() {
  if (attached) return;
  attached = true;
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || e.ctrlKey || e.metaKey || e.altKey) return;
    if (isModalOpen()) return;
    e.preventDefault();

    const links = [...document.querySelectorAll(".link-list .link-list__label")];
    if (!links.length) return;

    const index = links.indexOf(document.activeElement);
    const step = e.shiftKey ? -1 : 1;
    const next =
      index === -1
        ? links.at(e.shiftKey ? -1 : 0)
        : links[(index + step + links.length) % links.length];
    next.focus();
  });
}
