import { sortDragThresholdPx, sortFlipDurationMs } from "../../../defaults.js";

export function makeSortable(container, { selector, onReorder, axis = "y" }) {
  let dragEl = null;
  let ghost = null;
  let pointerId = null;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let offsetX = 0;
  let offsetY = 0;
  let reorderLocked = false;

  function items() {
    return [...container.querySelectorAll(selector)];
  }

  function recordRects() {
    const map = new Map();
    items().forEach((el) => map.set(el, el.getBoundingClientRect()));
    return map;
  }

  function playFlip(oldRects) {
    items().forEach((el) => {
      const oldRect = oldRects.get(el);
      if (!oldRect || el === dragEl) return;
      const newRect = el.getBoundingClientRect();
      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;
      if (!dx && !dy) return;
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = `transform ${sortFlipDurationMs}ms ease`;
        el.style.transform = "";
      });
    });
  }

  function clearTransforms() {
    items().forEach((el) => {
      el.style.transition = "";
      el.style.transform = "";
    });
  }

  function suppressNextClick(el) {
    const blocker = (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      el.removeEventListener("click", blocker, true);
    };
    el.addEventListener("click", blocker, true);
  }

  function startDrag(item, originTarget, ev) {
    dragging = true;
    reorderLocked = false;
    suppressNextClick(originTarget);
    const rect = item.getBoundingClientRect();
    offsetX = ev.clientX - rect.left;
    offsetY = ev.clientY - rect.top;

    ghost = item.cloneNode(true);
    ghost.classList.add("is-ghost");
    Object.assign(ghost.style, {
      position: "fixed",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      margin: "0",
      pointerEvents: "none",
      zIndex: "1000",
    });
    document.body.appendChild(ghost);

    item.classList.add("is-dragging-source");
    document.body.classList.add("is-sorting");
  }

  function moveGhost(ev) {
    ghost.style.left = `${ev.clientX - offsetX}px`;
    ghost.style.top = `${ev.clientY - offsetY}px`;
  }

  function maybeReorderDom(ev) {
    if (reorderLocked) return;

    const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest(selector);
    if (!target || target === dragEl || !container.contains(target)) return;

    const all = items();
    const dragIndex = all.indexOf(dragEl);
    const targetIndex = all.indexOf(target);
    if (dragIndex === -1 || targetIndex === -1) return;

    const rect = target.getBoundingClientRect();
    const movingForward = dragIndex < targetIndex;
    const pastMidpoint =
      axis === "y"
        ? movingForward
          ? ev.clientY > rect.top + rect.height / 2
          : ev.clientY < rect.top + rect.height / 2
        : movingForward
          ? ev.clientX > rect.left + rect.width / 2
          : ev.clientX < rect.left + rect.width / 2;
    if (!pastMidpoint) return;

    const oldRects = recordRects();
    if (movingForward) {
      target.after(dragEl);
    } else {
      target.before(dragEl);
    }
    playFlip(oldRects);

    reorderLocked = true;
    setTimeout(() => {
      reorderLocked = false;
    }, sortFlipDurationMs);
  }

  function endDrag() {
    ghost?.remove();
    ghost = null;
    dragEl.classList.remove("is-dragging-source");
    document.body.classList.remove("is-sorting");
    clearTransforms();

    const finalIndex = items().indexOf(dragEl);
    onReorder(dragEl.dataset.dragId, finalIndex);
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    const item = e.target.closest(selector);
    if (!item || item.dataset.noDrag) return;

    const interactiveField = e.target.closest("button, input");
    if (interactiveField && interactiveField !== item) return;

    pointerId = e.pointerId;
    dragEl = item;
    dragging = false;
    startX = e.clientX;
    startY = e.clientY;
    const originTarget = e.target;

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;
      if (!dragging) {
        if (
          Math.abs(ev.clientX - startX) < sortDragThresholdPx &&
          Math.abs(ev.clientY - startY) < sortDragThresholdPx
        ) {
          return;
        }
        startDrag(item, originTarget, ev);
      }
      moveGhost(ev);
      maybeReorderDom(ev);
    };

    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      if (dragging) endDrag();
      dragEl = null;
      pointerId = null;
      dragging = false;
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  }

  container.addEventListener("pointerdown", onPointerDown);
}
