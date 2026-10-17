let fieldCount = 0;

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function pluralize(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function buildCheckbox(kind, checked, onChange) {
  fieldCount += 1;
  const input = el("input", "bookmark-dialog__checkbox");
  input.type = "checkbox";
  input.name = `bookmark-dialog-${kind}-${fieldCount}`;
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  return input;
}

export function buildCheckLabel(className, checkbox, text) {
  const label = el("label", className);
  label.append(checkbox, text);
  return label;
}

// A checkbox that selects or clears every row, showing a dash when only some are on.
export function buildSelectAll(text, rows, onChange) {
  const checkbox = buildCheckbox("select-all", true, (checked) => {
    rows.forEach((row) => {
      row.include = checked;
    });
    onChange();
  });
  const count = el("span", "bookmark-dialog__count");
  const label = el("label", "bookmark-dialog__select-all");
  label.append(checkbox, el("span", "bookmark-dialog__select-all-label", text), count);

  function sync(noun) {
    const included = rows.filter((r) => r.include).length;
    checkbox.checked = included === rows.length;
    checkbox.indeterminate = included > 0 && included < rows.length;
    count.textContent = `${included} of ${pluralize(rows.length, noun)}`;
  }
  return { element: label, sync };
}
