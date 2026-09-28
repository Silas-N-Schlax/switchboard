import { linksForTab, activeTab, isHomeTab, addLink, deleteLink, reorderLink } from "../features/tabLinks/store.js";
import { makeSortable } from "../features/tabLinks/sortable.js";
import { openAddLinkModal } from "../features/tabLinks/linkModal.js";
import { getSearchQuery, getSearchMatches } from "../features/search/state.js";
import { buildShortcutBadges } from "../features/keybinds/shortcutBadges.js";
import { getKeybind } from "../features/keybinds/registry.js";
import { launchGroup, launchGroupLinks } from "../features/launchGroups/index.js";
import { recordEvent, recordLinkOpen, StatEvent } from "../features/stats/recorder.js";
import { linkListSplitThreshold } from "../../defaults.js";

function recordOpen(link, e, searching) {
  if (searching) {
    recordEvent(StatEvent.search, { outcome: "link" });
    return recordLinkOpen(link, "search");
  }
  return recordLinkOpen(link, e.detail === 0 ? "keyboard" : "click");
}

// Plain clicks navigate this tab away, so the stat write is awaited first; modified and
// middle clicks leave this page open and can record in the background.
function trackOpens(anchor, link, searching) {
  anchor.addEventListener("click", (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      recordOpen(link, e, searching);
      return;
    }
    e.preventDefault();
    recordOpen(link, e, searching).then(() => {
      window.location.href = link.url;
    });
  });
  anchor.addEventListener("auxclick", (e) => {
    if (e.button === 1) recordOpen(link, e, searching);
  });
}

function buildLaunchBar(tab) {
  const groupLinks = launchGroupLinks(tab.id);
  if (!groupLinks.length) return null;

  const bar = document.createElement("button");
  bar.type = "button";
  bar.className = "launch-bar";
  bar.setAttribute("aria-label", `Launch ${groupLinks.map((l) => l.label).join(", ")}`);

  const title = document.createElement("span");
  title.className = "launch-bar__title";
  title.textContent = "▶ Launch";

  const steps = document.createElement("span");
  steps.className = "launch-bar__steps";
  groupLinks.forEach((link, i) => {
    if (i > 0) {
      const arrow = document.createElement("span");
      arrow.className = "launch-bar__arrow";
      arrow.textContent = "→";
      arrow.setAttribute("aria-hidden", "true");
      steps.appendChild(arrow);
    }
    const step = document.createElement("span");
    step.className = "launch-bar__step";
    const index = document.createElement("span");
    index.className = "launch-index";
    index.textContent = i + 1;
    const label = document.createElement("span");
    label.className = "launch-bar__step-label";
    label.textContent = link.label;
    step.append(index, label);
    steps.appendChild(step);
  });
  bar.append(title, steps);

  const key = getKeybind("launch-group");
  if (key) {
    const hint = document.createElement("span");
    hint.className = "keybind-badge launch-bar__hint";
    hint.textContent = key.toUpperCase();
    bar.appendChild(hint);
  }

  bar.addEventListener("click", () => launchGroup(tab.id));
  return bar;
}

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

  const launchBar = searching ? null : buildLaunchBar(tab);
  if (launchBar) list.appendChild(launchBar);
  const launchIndexById = new Map(launchGroupLinks(tab.id).map((l, i) => [l.id, i + 1]));

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
    trackOpens(anchor, link, searching);

    const url = document.createElement("span");
    url.className = "link-list__url";
    url.textContent = link.url;

    if (!searching && launchIndexById.has(link.id)) {
      row.classList.add("link-list__row--launch");
      const index = document.createElement("span");
      index.className = "launch-index link-list__launch-index";
      index.textContent = launchIndexById.get(link.id);
      index.title = "Launch order";
      row.appendChild(index);
    }

    row.append(anchor);

    if (link.shortcutKey) {
      row.appendChild(buildShortcutBadges(link.shortcutKey));
    }

    row.append(url);

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
      openAddLinkModal(document.body, async ({ label, url, shortcutKey }) => {
        const currentTab = activeTab();
        if (!currentTab) return;
        await addLink(currentTab.id, { label, url, shortcutKey });
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
