import {
  sortedTabs,
  activeTab,
  addTab,
  deleteTab,
  reorderTab,
  setActiveTab,
} from "../features/tabLinks/store.js";
import { makeSortable } from "../features/tabLinks/sortable.js";
import { registerTabSwitchKeybinds } from "../features/tabLinks/tabSwitchKeybinds.js";
import { getKeybind } from "../features/keybinds/registry.js";
import { maxTabs } from "../../defaults.js";

function buildAddControl(onAdd) {
  const wrap = document.createElement("div");
  wrap.className = "tab-dock__add-wrap";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "tab-dock__add";
  button.textContent = "+";
  button.setAttribute("aria-label", "Add tab");

  const input = document.createElement("input");
  input.type = "text";
  input.className = "tab-dock__add-input";
  input.placeholder = "Tab name";

  function showInput() {
    wrap.classList.add("tab-dock__add-wrap--editing");
    input.value = "";
    input.focus();
  }
  function hideInput() {
    wrap.classList.remove("tab-dock__add-wrap--editing");
  }

  button.addEventListener("click", showInput);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      onAdd(input.value.trim());
      hideInput();
    } else if (e.key === "Escape") {
      hideInput();
    }
  });
  input.addEventListener("blur", hideInput);

  wrap.append(button, input);
  return wrap;
}

export function renderTabs(container, onChange) {
  let dock = container.querySelector(".tab-dock");
  const isNew = !dock;
  if (isNew) {
    dock = document.createElement("div");
    dock.className = "tab-dock";
    container.appendChild(dock);
  }
  dock.innerHTML = "";

  const tabs = sortedTabs();
  const current = activeTab();

  tabs.forEach((tab, index) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "tab-dock__tab";
    if (current && tab.id === current.id) el.classList.add("tab-dock__tab--active");
    el.dataset.dragId = tab.id;

    const badge = document.createElement("span");
    badge.className = "tab-dock__badge";
    badge.textContent =
      index < maxTabs ? getKeybind(`tab-switch-${index + 1}`) ?? "" : "";

    const name = document.createElement("span");
    name.className = "tab-dock__name";
    name.textContent = tab.name;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "tab-dock__remove";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Delete ${tab.name}`);
    remove.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (tabs.length <= 1) return;
      if (!confirm(`Delete tab "${tab.name}" and all its links?`)) return;
      await deleteTab(tab.id);
      onChange();
    });

    el.append(badge, name, remove);
    el.addEventListener("click", async () => {
      setActiveTab(tab.id);
      onChange();
    });

    dock.appendChild(el);
  });

  if (tabs.length < maxTabs) {
    dock.appendChild(
      buildAddControl(async (name) => {
        await addTab(name);
        onChange();
      })
    );
  }

  registerTabSwitchKeybinds(onChange);

  if (isNew) {
    makeSortable(dock, {
      selector: ".tab-dock__tab",
      axis: "x",
      onReorder: async (tabId, index) => {
        await reorderTab(tabId, index);
        onChange();
      },
    });
  }
}
