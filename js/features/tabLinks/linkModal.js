let modalEl = null;
let submitHandler = null;

function closeModal() {
  modalEl.classList.remove("link-modal--open");
  modalEl.querySelector("form").reset();
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

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "link-modal__submit";

  form.append(labelInput, urlInput, submit);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const label = labelInput.value.trim();
    const url = urlInput.value.trim();
    if (!label || !url) return;
    submitHandler?.({ label, url });
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
  return modal;
}

export function openLinkModal(root, { title = "Add link", submitLabel = "Add link", initial = {}, onSubmit }) {
  if (!modalEl) {
    modalEl = buildModal();
    root.appendChild(modalEl);
  }
  submitHandler = onSubmit;
  modalEl.__titleEl.textContent = title;
  modalEl.__submitEl.textContent = submitLabel;
  modalEl.__labelInput.value = initial.label ?? "";
  modalEl.__urlInput.value = initial.url ?? "";
  modalEl.classList.add("link-modal--open");
  modalEl.__labelInput.focus();
}

export function openAddLinkModal(root, onSubmit) {
  openLinkModal(root, { onSubmit });
}
