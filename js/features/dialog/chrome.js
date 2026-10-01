export function buildDialogHeader({ title, subtitle = null, closeLabel = "Close" }) {
  const header = document.createElement("div");
  header.className = "dialog__header";

  const titleWrap = document.createElement("div");
  titleWrap.className = "dialog__title-wrap";
  const titleEl = document.createElement("h2");
  titleEl.className = "dialog__title";
  titleEl.textContent = title;
  titleWrap.appendChild(titleEl);

  let subtitleEl = null;
  if (subtitle !== null) {
    subtitleEl = document.createElement("span");
    subtitleEl.className = "dialog__subtitle";
    subtitleEl.textContent = subtitle;
    titleWrap.appendChild(subtitleEl);
  }

  const close = document.createElement("button");
  close.type = "button";
  close.className = "dialog__close keybind-badge";
  close.textContent = "esc";
  close.setAttribute("aria-label", closeLabel);

  header.append(titleWrap, close);
  return { header, titleEl, subtitleEl, close };
}

export function buildDialogGroup({ label, rows = [], note = null }) {
  const group = document.createElement("section");
  group.className = "dialog-group";

  const labelEl = document.createElement("h3");
  labelEl.className = "dialog-group__label";
  labelEl.textContent = label;

  const panel = document.createElement("div");
  panel.className = "dialog-group__panel";
  panel.append(...rows);

  group.append(labelEl, panel);

  if (note) {
    const noteEl = document.createElement("p");
    noteEl.className = "dialog-group__note";
    noteEl.textContent = note;
    group.appendChild(noteEl);
  }

  return { group, labelEl, panel };
}
