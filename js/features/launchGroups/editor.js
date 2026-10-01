import { state } from "../../state.js";
import { linksForTab, displayHost } from "../tabLinks/store.js";
import { makeSortable } from "../tabLinks/sortable.js";
import { buildDialogHeader } from "../dialog/chrome.js";
import { launchGroupLinks, setLinkLaunchGroup, reorderLaunchGroup } from "./store.js";

let editor = null;
let tabId = null;
let onChangeRef = null;
let returnFocusEl = null;

function matches(link, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return link.label.toLowerCase().includes(q) || link.url.toLowerCase().includes(q);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function buildItem(link, launchIndex, draggable) {
  const grouped = launchIndex != null;
  const item = el("div", "launch-editor__item");
  item.classList.toggle("launch-editor__item--grouped", grouped);
  item.tabIndex = 0;
  item.setAttribute("role", "checkbox");
  item.setAttribute("aria-checked", String(grouped));
  item.dataset.linkId = link.id;
  if (grouped) item.dataset.dragId = link.id;
  if (!draggable) item.dataset.noDrag = "true";

  item.append(
    el("span", "launch-editor__handle", grouped && draggable ? "⋮⋮" : ""),
    el("span", "launch-editor__check"),
    grouped ? el("span", "launch-index", launchIndex) : el("span"),
    el("span", "launch-editor__label", link.label),
    el("span", "launch-editor__url", displayHost(link.url))
  );
  item.addEventListener("click", () => toggle(link.id));
  return item;
}

function hint(keys, label) {
  const wrap = el("span", "dialog-hint");
  keys.forEach((k) => wrap.appendChild(el("span", "keybind-badge", k)));
  wrap.appendChild(el("span", "dialog-hint__label", label));
  return wrap;
}

function build(root) {
  const modal = el("div", "launch-editor");
  const backdrop = el("div", "launch-editor__backdrop overlay-backdrop");
  const dialog = el("div", "launch-editor__dialog dialog surface surface--modal");

  const { header, subtitleEl: tabName, close } = buildDialogHeader({
    title: "Launch group",
    subtitle: "",
    closeLabel: "Close launch group editor",
  });

  const filter = el("input", "launch-editor__filter");
  filter.type = "text";
  filter.placeholder = "Filter links…";
  filter.autocomplete = "off";
  filter.spellcheck = false;

  const filterWrap = el("div", "launch-editor__filter-wrap");
  filterWrap.appendChild(filter);

  const body = el("div", "launch-editor__body dialog__body custom-scrollbar");
  const groupHeading = el("h3", "launch-editor__heading", "Launch order");
  const groupList = el("div", "launch-editor__list");
  const empty = el("p", "launch-editor__empty");
  const restHeading = el("h3", "launch-editor__heading", "Other links");
  const restList = el("div", "launch-editor__list");
  body.append(groupHeading, groupList, empty, restHeading, restList);

  const footer = el("div", "dialog__footer");
  footer.append(
    hint(["↑", "↓"], "move"),
    hint(["space"], "toggle"),
    hint(["⌥", "↑", "↓"], "reorder")
  );

  dialog.append(header, filterWrap, body, footer);
  modal.append(backdrop, dialog);
  root.appendChild(modal);

  close.addEventListener("click", closeEditor);
  backdrop.addEventListener("click", closeEditor);
  filter.addEventListener("input", () => refresh());
  modal.addEventListener("keydown", onKeyDown);

  makeSortable(groupList, {
    selector: ".launch-editor__item--grouped",
    onReorder: async (linkId, index) => {
      await reorderLaunchGroup(tabId, linkId, index);
      commit(linkId);
    },
  });

  return { modal, tabName, filter, groupHeading, groupList, empty, restHeading, restList };
}

function items() {
  return [...editor.modal.querySelectorAll(".launch-editor__item")];
}

function focusItem(linkId) {
  editor.modal.querySelector(`.launch-editor__item[data-link-id="${linkId}"]`)?.focus();
}

function refresh(focusLinkId = null) {
  const tab = state.tabs.find((t) => t.id === tabId);
  if (!tab) return closeEditor();
  editor.tabName.textContent = tab.name;

  const query = editor.filter.value.trim();
  const group = launchGroupLinks(tabId);
  const groupIds = new Set(group.map((l) => l.id));
  const rest = linksForTab(tabId).filter((l) => !groupIds.has(l.id));

  // Reordering a filtered subset would map drop positions onto the wrong slots in
  // the full group, so drag is only offered while the list is unfiltered.
  const draggable = !query;
  editor.groupList.innerHTML = "";
  group.forEach((link, i) => {
    if (matches(link, query)) editor.groupList.appendChild(buildItem(link, i + 1, draggable));
  });
  editor.restList.innerHTML = "";
  rest.filter((l) => matches(l, query)).forEach((link) => editor.restList.appendChild(buildItem(link, null, false)));

  let emptyText = "";
  if (!group.length && !rest.length) emptyText = "This tab has no links yet.";
  else if (!group.length) emptyText = "Nothing here yet — check links below to add them.";
  else if (!editor.groupList.children.length) emptyText = "No matches in the group.";
  editor.empty.textContent = emptyText;
  editor.restHeading.hidden = !editor.restList.children.length;

  if (focusLinkId) focusItem(focusLinkId);
}

function commit(focusLinkId) {
  refresh(focusLinkId);
  onChangeRef?.();
}

async function toggle(linkId) {
  const link = state.links.find((l) => l.id === linkId);
  if (!link) return;
  await setLinkLaunchGroup(linkId, !link.launchGroup);
  commit(linkId);
}

async function nudge(linkId, delta) {
  const group = launchGroupLinks(tabId);
  const index = group.findIndex((l) => l.id === linkId);
  if (index === -1) return;
  await reorderLaunchGroup(tabId, linkId, index + delta);
  commit(linkId);
}

function onKeyDown(e) {
  // Contain every key so app keybinds and link shortcuts can't fire behind the modal.
  e.stopPropagation();

  if (e.key === "Escape") {
    e.preventDefault();
    closeEditor();
    return;
  }

  const all = items();
  if (e.target === editor.filter) {
    if (e.key === "ArrowDown" && all.length) {
      e.preventDefault();
      all[0].focus();
    } else if (e.key === "Enter" && editor.filter.value.trim()) {
      e.preventDefault();
      const target = all.find((i) => i.getAttribute("aria-checked") === "false") ?? all[0];
      if (!target) return;
      editor.filter.value = "";
      toggle(target.dataset.linkId).then(() => editor.filter.focus());
    }
    return;
  }

  const item = e.target.closest?.(".launch-editor__item");
  if (!item) return;
  const linkId = item.dataset.linkId;
  const grouped = item.classList.contains("launch-editor__item--grouped");
  const index = all.indexOf(item);

  if ((e.key === "ArrowUp" || e.key === "ArrowDown") && e.altKey) {
    e.preventDefault();
    if (grouped && !editor.filter.value.trim()) nudge(linkId, e.key === "ArrowUp" ? -1 : 1);
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    all[index + 1]?.focus();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    (all[index - 1] ?? editor.filter).focus();
  } else if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    toggle(linkId);
  } else if ((e.key === "Backspace" || e.key === "Delete") && grouped) {
    e.preventDefault();
    toggle(linkId);
  } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
    editor.filter.focus();
  }
}

// Hiding the modal doesn't blur its focused filter input, which would leave every
// app keybind swallowed as "typing" — so focus is handed back explicitly.
export function closeEditor() {
  if (!editor?.modal.classList.contains("launch-editor--open")) return;
  editor.modal.classList.remove("launch-editor--open");
  if (editor.modal.contains(document.activeElement)) document.activeElement.blur();
  if (returnFocusEl?.isConnected) returnFocusEl.focus();
  returnFocusEl = null;
}

export function openLaunchGroupEditor(root, forTabId, onChange) {
  if (!editor) editor = build(root);
  if (!editor.modal.classList.contains("launch-editor--open")) returnFocusEl = document.activeElement;
  tabId = forTabId;
  onChangeRef = onChange;
  editor.filter.value = "";
  refresh();
  editor.modal.classList.add("launch-editor--open");
  editor.filter.focus();
}
