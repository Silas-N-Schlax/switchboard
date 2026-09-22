import { linksForTab, activeTab, addLink, deleteLink, reorderLink } from "../features/tabLinks/store.js";
import { makeSortable } from "../features/tabLinks/sortable.js";
import { openAddLinkModal } from "../features/tabLinks/linkModal.js";
import { linkListSplitThreshold } from "../../defaults.js";

export function renderLinks(container, onChange) {
  let list = container.querySelector(".link-list");
  const isNew = !list;
  if (isNew) {
    list = document.createElement("div");
    list.className = "link-list";
    container.appendChild(list);
  }
  list.innerHTML = "";

  const tab = activeTab();
  if (!tab) return;

  const links = linksForTab(tab.id);
  list.classList.toggle("link-list--split", links.length >= linkListSplitThreshold);

  links.forEach((link) => {
    const row = document.createElement("div");
    row.className = "link-list__row";
    row.dataset.dragId = link.id;

    const anchor = document.createElement("a");
    anchor.className = "link-list__label";
    anchor.href = link.url;
    anchor.textContent = link.label;
    anchor.draggable = false;

    const url = document.createElement("span");
    url.className = "link-list__url";
    url.textContent = link.url;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "link-list__delete";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Delete ${link.label}`);
    remove.addEventListener("click", async () => {
      await deleteLink(link.id);
      onChange();
    });

    row.append(anchor, url, remove);
    list.appendChild(row);
  });

  const addTile = document.createElement("button");
  addTile.type = "button";
  addTile.className = "link-list__add-tile";
  addTile.textContent = "+ Add link";
  addTile.addEventListener("click", () => {
    openAddLinkModal(document.body, async ({ label, url }) => {
      const currentTab = activeTab();
      if (!currentTab) return;
      await addLink(currentTab.id, { label, url });
      onChange();
    });
  });
  list.appendChild(addTile);

  if (isNew) {
    makeSortable(list, {
      selector: ".link-list__row",
      onReorder: async (linkId, index) => {
        const currentTab = activeTab();
        if (!currentTab) return;
        await reorderLink(linkId, currentTab.id, index);
        onChange();
      },
    });
  }
}
