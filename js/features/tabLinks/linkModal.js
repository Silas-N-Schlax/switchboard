import { isModifierOnlyKey, serializeShortcutEvent } from "../keybinds/shortcutFormat.js";
import { buildShortcutBadges } from "../keybinds/shortcutBadges.js";
import { findShortcutConflict } from "../keybinds/shortcutValidation.js";
import { normalizeUrl } from "./store.js";

const HOSTNAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

function isValidUrl(raw) {
  let parsed;
  try {
    parsed = new URL(normalizeUrl(raw));
  } catch {
    return false;
  }
  // Chromium's URL() percent-encodes stray characters (e.g. spaces) into the
  // hostname instead of throwing, so "not a url" parses "successfully" as
  // https://not%20a%20url/ — also require the hostname to look like a real domain.
  const { hostname } = parsed;
  return hostname === "localhost" || HOSTNAME_PATTERN.test(hostname);
}

let modalEl = null;
let submitHandler = null;
let currentShortcutKey = null;
let editingLinkId = null;

function closeModal() {
  modalEl.classList.remove("link-modal--open");
  modalEl.querySelector("form").reset();
  modalEl.__urlError.textContent = "";
  setShortcut(null);
}

function setShortcut(value) {
  currentShortcutKey = value;
  const field = modalEl.__shortcutInput;
  field.innerHTML = "";
  if (value) {
    field.appendChild(buildShortcutBadges(value));
  } else {
    const placeholder = document.createElement("span");
    placeholder.className = "link-modal__shortcut-placeholder";
    placeholder.textContent = "Click and press keys…";
    field.appendChild(placeholder);
  }
  modalEl.__shortcutError.textContent = "";
}

function buildModal() {
  const modal = document.createElement("div");
  modal.className = "link-modal";

  const backdrop = document.createElement("div");
  backdrop.className = "link-modal__backdrop overlay-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "link-modal__dialog surface surface--modal";

  const header = document.createElement("div");
  header.className = "link-modal__header";
  const title = document.createElement("h2");
  title.className = "link-modal__title";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "link-modal__close dialog-close";
  close.textContent = "×";
  close.setAttribute("aria-label", "Close");
  header.append(title, close);

  const form = document.createElement("form");
  form.className = "link-modal__form";

  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.className = "link-modal__input";
  labelInput.placeholder = "Label";
  labelInput.required = true;
  labelInput.autocomplete = "off";

  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.className = "link-modal__input";
  urlInput.placeholder = "URL";
  urlInput.required = true;
  urlInput.autocomplete = "off";

  const urlError = document.createElement("p");
  urlError.className = "link-modal__url-error";
  urlInput.addEventListener("input", () => {
    urlError.textContent = "";
  });

  const shortcutFieldLabel = document.createElement("label");
  shortcutFieldLabel.className = "link-modal__shortcut-label";
  shortcutFieldLabel.textContent = "Shortcut";

  const shortcutRow = document.createElement("div");
  shortcutRow.className = "link-modal__shortcut-row";

  const shortcutInput = document.createElement("div");
  shortcutInput.className = "link-modal__shortcut-input";
  shortcutInput.tabIndex = 0;
  shortcutInput.setAttribute("role", "textbox");
  shortcutInput.setAttribute("aria-label", "Shortcut — click and press keys");

  const shortcutClear = document.createElement("button");
  shortcutClear.type = "button";
  shortcutClear.className = "link-modal__shortcut-clear dialog-close";
  shortcutClear.textContent = "×";
  shortcutClear.setAttribute("aria-label", "Clear shortcut");

  shortcutRow.append(shortcutInput, shortcutClear);

  const shortcutError = document.createElement("p");
  shortcutError.className = "link-modal__shortcut-error";

  shortcutInput.addEventListener("keydown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      shortcutInput.blur();
      return;
    }
    if (e.key === "Enter") {
      form.requestSubmit();
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      setShortcut(null);
      return;
    }
    if (isModifierOnlyKey(e.key)) return;

    const candidate = serializeShortcutEvent(e);
    const conflict = findShortcutConflict(candidate, { excludeLinkId: editingLinkId });
    if (conflict) {
      shortcutError.textContent = conflict.message;
      return;
    }
    setShortcut(candidate);
  });
  shortcutClear.addEventListener("click", () => setShortcut(null));

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "link-modal__submit";

  form.append(labelInput, urlInput, urlError, shortcutFieldLabel, shortcutRow, shortcutError, submit);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const label = labelInput.value.trim();
    const url = urlInput.value.trim();
    if (!label || !url) return;
    if (!isValidUrl(url)) {
      urlError.textContent = "Enter a valid URL";
      return;
    }
    submitHandler?.({ label, url, shortcutKey: currentShortcutKey });
    closeModal();
  });

  close.addEventListener("click", closeModal);
  backdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("link-modal--open")) closeModal();
  });

  dialog.append(header, form);
  modal.append(backdrop, dialog);
  modal.__titleEl = title;
  modal.__submitEl = submit;
  modal.__labelInput = labelInput;
  modal.__urlInput = urlInput;
  modal.__urlError = urlError;
  modal.__shortcutInput = shortcutInput;
  modal.__shortcutError = shortcutError;
  return modal;
}

export function openLinkModal(root, { title = "Add link", submitLabel = "Add link", initial = {}, onSubmit }) {
  if (!modalEl) {
    modalEl = buildModal();
    root.appendChild(modalEl);
  }
  submitHandler = onSubmit;
  editingLinkId = initial.id ?? null;
  modalEl.__titleEl.textContent = title;
  modalEl.__submitEl.textContent = submitLabel;
  modalEl.__labelInput.value = initial.label ?? "";
  modalEl.__urlInput.value = initial.url ?? "";
  modalEl.__urlError.textContent = "";
  setShortcut(initial.shortcutKey ?? null);
  modalEl.classList.add("link-modal--open");
  modalEl.__labelInput.focus();
}

export function openAddLinkModal(root, onSubmit) {
  openLinkModal(root, { onSubmit });
}
