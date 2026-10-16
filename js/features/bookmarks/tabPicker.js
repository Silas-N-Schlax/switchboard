let pickerCount = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function sameName(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function createTabPicker({ label, value, placeholder = "", getOptions, createOption, onChange }) {
  pickerCount += 1;
  const id = `tab-picker-${pickerCount}`;
  let current = value;
  let items = [];
  let activeIndex = -1;

  const wrap = el("div", "tab-picker");
  const input = el("input", "tab-picker__input select-input");
  input.type = "text";
  input.name = id;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-label", label);
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", `${id}-list`);
  wrap.appendChild(input);

  // Lives on <body> with fixed positioning, because the folder list scrolls and would
  // clip a menu positioned inside it.
  const menu = el("div", "tab-picker__menu surface custom-scrollbar");
  menu.id = `${id}-list`;
  menu.setAttribute("role", "listbox");

  function labelFor(v) {
    return getOptions().find((o) => o.value === v)?.label ?? "";
  }

  function showValue() {
    input.value = labelFor(current);
    input.placeholder = input.value ? "" : placeholder;
  }

  function isOpen() {
    return menu.isConnected;
  }

  function position() {
    const rect = input.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    menu.style.left = `${rect.left}px`;
    menu.style.width = `${rect.width}px`;
    if (below < 220 && rect.top > below) {
      menu.style.top = "";
      menu.style.bottom = `${window.innerHeight - rect.top + 4}px`;
    } else {
      menu.style.bottom = "";
      menu.style.top = `${rect.bottom + 4}px`;
    }
  }

  function render(query) {
    const options = getOptions();
    const q = query.trim();
    const matches = q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options;
    items = [...matches];
    if (q && !options.some((o) => sameName(o.label, q))) {
      const create = createOption(q);
      if (create) items.push({ ...create, create: true });
    }

    menu.replaceChildren(
      ...items.map((item, index) => {
        const option = el("div", "tab-picker__option");
        option.id = `${id}-option-${index}`;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", String(item.value === current));
        option.classList.toggle("tab-picker__option--create", !!item.create);
        if (item.disabled) option.setAttribute("aria-disabled", "true");
        option.append(el("span", "tab-picker__label", item.label));
        if (item.hint) option.append(el("span", "tab-picker__hint", item.hint));
        option.addEventListener("mousedown", (e) => {
          e.preventDefault();
          pick(index);
        });
        return option;
      })
    );
    if (!items.length) menu.append(el("div", "tab-picker__empty", "No matching tabs"));

    const selected = items.findIndex((item) => item.value === current && !item.disabled);
    const firstEnabled = items.findIndex((item) => !item.disabled);
    setActive(q ? firstEnabled : selected === -1 ? firstEnabled : selected);
  }

  function setActive(index) {
    activeIndex = index;
    [...menu.querySelectorAll(".tab-picker__option")].forEach((option, i) => {
      option.classList.toggle("tab-picker__option--active", i === index);
      if (i === index) option.scrollIntoView({ block: "nearest" });
    });
    if (index >= 0) input.setAttribute("aria-activedescendant", `${id}-option-${index}`);
    else input.removeAttribute("aria-activedescendant");
  }

  function moveActive(delta) {
    if (!items.length) return;
    let next = activeIndex;
    for (let step = 0; step < items.length; step++) {
      next = (next + delta + items.length) % items.length;
      if (!items[next].disabled) return setActive(next);
    }
  }

  function onResize() {
    position();
  }

  function onScroll(e) {
    if (e.target !== menu) close();
  }

  function open() {
    if (isOpen() || input.disabled) return;
    document.body.appendChild(menu);
    window.addEventListener("resize", onResize);
    document.addEventListener("scroll", onScroll, true);
    input.setAttribute("aria-expanded", "true");
    render("");
    position();
    input.select();
  }

  function close() {
    if (!isOpen()) return;
    menu.remove();
    window.removeEventListener("resize", onResize);
    document.removeEventListener("scroll", onScroll, true);
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    showValue();
  }

  function pick(index) {
    const item = items[index];
    if (!item || item.disabled) return;
    current = item.value;
    close();
    onChange(current);
  }

  input.addEventListener("click", open);
  input.addEventListener("blur", close);
  input.addEventListener("input", () => {
    if (!isOpen()) open();
    render(input.value);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen()) open();
      else moveActive(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Enter") {
      if (!isOpen()) return;
      e.preventDefault();
      pick(activeIndex);
    } else if (e.key === "Escape" && isOpen()) {
      // Only the menu closes; the dialog underneath stays open.
      e.preventDefault();
      e.stopPropagation();
      close();
      input.select();
    } else if (e.key === "Tab") {
      close();
    }
  });

  function setValue(next) {
    current = next;
    if (!isOpen()) showValue();
  }

  function setDisabled(disabled) {
    input.disabled = disabled;
    if (disabled) close();
  }

  showValue();
  return { element: wrap, input, setValue, setDisabled, close };
}
