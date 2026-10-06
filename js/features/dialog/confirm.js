import { buildDialogHeader } from "./chrome.js";

function buildButton(text, variant) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `confirm-dialog__button confirm-dialog__button--${variant}`;
  button.textContent = text;
  return button;
}

function focusableIn(el) {
  return [...el.querySelectorAll("button:not(:disabled)")];
}

function openDialog({ title, step, message, buttons, initialFocus }) {
  return new Promise((resolve) => {
    const returnFocusEl = document.activeElement;

    const root = document.createElement("div");
    root.className = "confirm-dialog";
    root.setAttribute("role", "alertdialog");
    root.setAttribute("aria-modal", "true");

    const backdrop = document.createElement("div");
    backdrop.className = "overlay-backdrop";

    const dialog = document.createElement("div");
    dialog.className = "confirm-dialog__dialog dialog surface";

    const { header, titleEl, close } = buildDialogHeader({
      title,
      subtitle: step ?? null,
      closeLabel: "Cancel",
    });
    titleEl.id = `confirm-dialog-title-${Date.now()}`;
    root.setAttribute("aria-labelledby", titleEl.id);

    const body = document.createElement("p");
    body.className = "confirm-dialog__message";
    body.textContent = message;

    const footer = document.createElement("div");
    footer.className = "dialog__footer confirm-dialog__footer";

    dialog.append(header, body, footer);
    root.append(backdrop, dialog);

    function finish(result) {
      root.remove();
      if (returnFocusEl?.isConnected) returnFocusEl.focus();
      resolve(result);
    }

    const buttonEls = buttons.map(({ text, variant, result }) => {
      const button = buildButton(text, variant);
      button.addEventListener("click", () => finish(result));
      return button;
    });
    footer.append(...buttonEls);

    const cancelResult = buttons[0].result;
    close.addEventListener("click", () => finish(cancelResult));
    backdrop.addEventListener("click", () => finish(cancelResult));

    root.addEventListener("keydown", (e) => {
      // Contain every key so app keybinds and link shortcuts can't fire behind the dialog.
      e.stopPropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        finish(cancelResult);
      } else if (e.key === "Tab") {
        const focusable = focusableIn(dialog);
        const index = focusable.indexOf(document.activeElement);
        const next = (index + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
        e.preventDefault();
        focusable[next].focus();
      }
    });

    document.body.appendChild(root);
    buttonEls[initialFocus ?? buttonEls.length - 1].focus();
  });
}

// Destructive confirms start focused on Cancel, so a reflexive Enter never deletes.
export function confirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  step = null,
}) {
  return openDialog({
    title,
    step,
    message,
    buttons: [
      { text: cancelLabel, variant: "ghost", result: false },
      { text: confirmLabel, variant: danger ? "danger" : "primary", result: true },
    ],
    initialFocus: danger ? 0 : 1,
  });
}

export function alertDialog({ title, message, buttonLabel = "OK" }) {
  return openDialog({
    title,
    message,
    buttons: [{ text: buttonLabel, variant: "primary", result: undefined }],
  });
}
