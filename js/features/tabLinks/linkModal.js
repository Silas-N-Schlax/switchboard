import { isModifierOnlyKey, serializeShortcutEvent } from "../keybinds/shortcutFormat.js";
import { buildShortcutBadges } from "../keybinds/shortcutBadges.js";
import { findShortcutConflict } from "../keybinds/shortcutValidation.js";
import { normalizeUrl } from "./store.js";
import { buildDialogHeader } from "../dialog/chrome.js";

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
let returnFocusEl = null;

// Hiding the modal doesn't blur its focused input, which would leave every app keybind
// swallowed as "typing" — so focus is handed back explicitly.
function closeModal() {
  if (modalEl.contains(document.activeElement)) document.activeElement.blur();
  if (returnFocusEl?.isConnected) returnFocusEl.focus();
  returnFocusEl = null;
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

function buildHint(key, label) {
  const hint = document.createElement("span");
  hint.className = "dialog-hint";
  const cap = document.createElement("span");
  cap.className = "keybind-badge";
  cap.textContent = key;
  const text = document.createElement("span");
  text.className = "dialog-hint__label";
  text.textContent = label;
  hint.append(cap, text);
  return hint;
}

function buildModal() {
  const modal = document.createElement("div");
  modal.className = "link-modal";

  const backdrop = document.createElement("div");
  backdrop.className = "link-modal__backdrop overlay-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "link-modal__dialog dialog surface surface--modal";

  const { header, titleEl: title, close } = buildDialogHeader({ title: "Add link" });

  const form = document.createElement("form");
  form.className = "link-modal__form";

  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.className = "link-modal__input";
  labelInput.placeholder = "Label";
  labelInput.setAttribute("aria-label", "Label");
  labelInput.required = true;
  labelInput.autocomplete = "off";

  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.className = "link-modal__input";
  urlInput.placeholder = "URL — example.com";
  urlInput.setAttribute("aria-label", "URL");
  urlInput.required = true;
  urlInput.autocomplete = "off";

  const urlError = document.createElement("p");
  urlError.className = "link-modal__url-error";
  urlInput.addEventListener("input", () => {
    urlError.textContent = "";
  });

  const shortcutFieldLabel = document.createElement("label");
  shortcutFieldLabel.className = "dialog-group__label";
  shortcutFieldLabel.textContent = "Shortcut";
  const optional = document.createElement("span");
  optional.className = "link-modal__optional";
  optional.textContent = "optional";
  shortcutFieldLabel.appendChild(optional);

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

  const fields = document.createElement("div");
  fields.className = "link-modal__fields dialog-group__panel";
  fields.append(labelInput, urlInput);

  const shortcutField = document.createElement("div");
  shortcutField.className = "dialog-group";
  shortcutField.append(shortcutFieldLabel, shortcutRow, shortcutError);

  const body = document.createElement("div");
  body.className = "dialog__body";
  body.append(fields, urlError, shortcutField);

  const footer = document.createElement("div");
  footer.className = "dialog__footer link-modal__footer";
  footer.append(buildHint("↵", "save"), submit);

  form.append(body, footer);
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
  modal.addEventListener("keydown", (e) => {
    // Contain every key so app keybinds and link shortcuts can't fire behind the modal.
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    }
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
  if (!modalEl.classList.contains("link-modal--open")) returnFocusEl = document.activeElement;
  modalEl.classList.add("link-modal--open");
  modalEl.__labelInput.focus();
}

export function openAddLinkModal(root, onSubmit) {
  openLinkModal(root, { onSubmit });
}
