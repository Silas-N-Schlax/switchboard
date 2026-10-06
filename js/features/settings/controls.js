export function buildRow({ labelText, control, tag = "label" }) {
  const row = document.createElement(tag);
  row.className = "settings-panel__row";
  const label = document.createElement("span");
  label.className = "settings-panel__label";
  label.textContent = labelText;
  row.append(label, control);
  return row;
}

export function buildToggleSwitch(checked, onChange) {
  const label = document.createElement("label");
  label.className = "toggle-switch";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "toggle-switch__input";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));

  const track = document.createElement("span");
  track.className = "toggle-switch__track";
  const thumb = document.createElement("span");
  thumb.className = "toggle-switch__thumb";
  track.appendChild(thumb);

  label.append(input, track);
  return { element: label, input };
}

export function buildRange({ min, max, step, value, onChange }) {
  const input = document.createElement("input");
  input.type = "range";
  input.className = "range-slider";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener("input", () => onChange(Number(input.value)));
  return input;
}

export function buildNumberInput({ min, max, value, onChange }) {
  const input = document.createElement("input");
  input.type = "number";
  input.className = "number-input";
  input.min = String(min);
  input.max = String(max);
  input.step = "1";
  input.value = String(value);
  let current = value;

  function setValue(next) {
    current = next;
    input.value = String(next);
  }

  function commit() {
    const parsed = Math.round(Number(input.value));
    const next = input.value !== "" && Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : current;
    setValue(next);
    onChange(next);
  }

  input.addEventListener("change", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
  });
  return { element: input, setValue };
}

export function buildSelect({ options, value, onChange }) {
  const select = document.createElement("select");
  select.className = "select-input";
  let currentOptions = [];

  function setOptions(nextOptions, nextValue) {
    currentOptions = nextOptions;
    select.replaceChildren(
      ...nextOptions.map((option, index) => {
        const el = document.createElement("option");
        el.value = String(index);
        el.textContent = option.label;
        return el;
      })
    );
    setValue(nextValue);
  }

  function setValue(nextValue) {
    const index = currentOptions.findIndex((option) => option.value === nextValue);
    select.value = String(Math.max(0, index));
  }

  select.addEventListener("change", () => onChange(currentOptions[Number(select.value)].value));
  setOptions(options, value);
  return { element: select, setValue, setOptions };
}
