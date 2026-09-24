import { linksForTab, activeTab, isHomeTab, addLink, deleteLink, reorderLink } from "../features/tabLinks/store.js";
import { makeSortable } from "../features/tabLinks/sortable.js";
import { openAddLinkModal } from "../features/tabLinks/linkModal.js";
import { getSearchQuery, getSearchMatches } from "../features/search/state.js";
import { linkListSplitThreshold } from "../../defaults.js";

export function renderLinks(container, onChange) {
  let list = container.querySelector(".link-list");
  const isNew = !list;
  if (isNew) {
    list = document.createElement("div");
    list.className = "link-list custom-scrollbar";
    container.appendChild(list);
  }
  list.innerHTML = "";

  const tab = activeTab();
  if (!tab) return;

  const home = isHomeTab(tab);
  const searching = home && getSearchQuery().trim().length > 0;
  const tabNameByLinkId = searching
    ? new Map(getSearchMatches().map((m) => [m.link.id, m.tabName]))
    : null;

  const links = searching ? getSearchMatches().map((m) => m.link) : linksForTab(tab.id);
  list.classList.toggle("link-list--split", links.length >= linkListSplitThreshold);

  links.forEach((link) => {
    const row = document.createElement("div");
    row.className = "link-list__row";
    if (searching) {
      row.classList.add("link-list__row--static");
      row.dataset.noDrag = "true";
    } else {
      row.dataset.dragId = link.id;
    }

    const anchor = document.createElement("a");
    anchor.className = "link-list__label";
    anchor.href = link.url;
    anchor.textContent = link.label;
    anchor.draggable = false;

    const url = document.createElement("span");
    url.className = "link-list__url";
    url.textContent = link.url;

    row.append(anchor, url);

    if (searching) {
      const tabBadge = document.createElement("span");
      tabBadge.className = "link-list__row-tab";
      tabBadge.textContent = tabNameByLinkId.get(link.id) ?? "";
      row.appendChild(tabBadge);
    } else {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "link-list__delete";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Delete ${link.label}`);
      remove.addEventListener("click", async () => {
        await deleteLink(link.id);
        onChange();
      });
      row.appendChild(remove);
    }

    list.appendChild(row);
  });

  if (!home) {
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
  }

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
