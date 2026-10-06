import {
  linksInGroup,
  activeTab,
  isHomeTab,
  addLink,
  deleteLink,
  reorderLink,
  displayHost,
  displayUrl,
} from "../features/tabLinks/store.js";
import { openUrl } from "../features/tabLinks/openUrl.js";
import { makeSortable } from "../features/tabLinks/sortable.js";
import { openAddLinkModal } from "../features/tabLinks/linkModal.js";
import { getSearchQuery, getSearchMatches } from "../features/search/state.js";
import { buildShortcutBadges } from "../features/keybinds/shortcutBadges.js";
import { getKeybind } from "../features/keybinds/registry.js";
import { launchGroup, launchGroupLinks } from "../features/launchGroups/index.js";
import { recordEvent, recordLinkOpen, StatEvent } from "../features/stats/recorder.js";
import { buildFavicon } from "../features/favicons/favicon.js";
import {
  linkGroupsForTab,
  renameLinkGroup,
  getRenamingLinkGroupId,
  beginRenameLinkGroup,
  endRenameLinkGroup,
} from "../features/linkGroups/index.js";
import { state } from "../state.js";

function recordOpen(link, e, searching) {
  if (searching) {
    recordEvent(StatEvent.search, { outcome: "link" });
    return recordLinkOpen(link, "search");
  }
  return recordLinkOpen(link, e.detail === 0 ? "keyboard" : "click");
}

// Plain clicks may navigate this tab away, so the stat write is awaited first; modified
// and middle clicks leave this page open and can record in the background.
function trackOpens(anchor, link, searching) {
  anchor.addEventListener("click", (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      recordOpen(link, e, searching);
      return;
    }
    e.preventDefault();
    recordOpen(link, e, searching).then(() => openUrl(link.url));
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

function buildLinkRow(link, { searching, compact, launchIndex, tabName, onChange }) {
  const row = document.createElement("div");
  row.className = "link-list__row";
  if (compact) row.classList.add("link-list__row--compact");
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
  anchor.title = link.url;
  anchor.draggable = false;
  trackOpens(anchor, link, searching);

  if (launchIndex) {
    row.classList.add("link-list__row--launch");
    const index = document.createElement("span");
    index.className = "launch-index link-list__launch-index";
    index.textContent = launchIndex;
    index.title = "Launch order";
    row.appendChild(index);
  }

  if (state.settings.showFavicons) {
    row.classList.add("link-list__row--favicon");
    row.appendChild(buildFavicon(link.url, "link-list__favicon"));
  }

  row.append(anchor);

  if (link.shortcutKey) {
    row.appendChild(buildShortcutBadges(link.shortcutKey));
  }

  if (!compact) {
    const url = document.createElement("span");
    url.className = "link-list__url";
    url.textContent = state.settings.showFullUrl ? displayUrl(link.url) : displayHost(link.url);
    url.classList.toggle("link-list__url--full", state.settings.showFullUrl);
    row.append(url);
  }

  if (searching) {
    const tabBadge = document.createElement("span");
    tabBadge.className = "link-list__row-tab";
    tabBadge.textContent = tabName ?? "";
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

  return row;
}

function buildGroupLabel(group, onChange) {
  if (getRenamingLinkGroupId() !== group.id) {
    const label = document.createElement("h3");
    label.className = "link-group__label";
    label.textContent = group.name;
    label.addEventListener("dblclick", () => beginRenameLinkGroup(group.id, onChange));
    return label;
  }

  const input = document.createElement("input");
  input.type = "text";
  input.className = "link-group__rename-input";
  input.value = group.name;
  input.setAttribute("aria-label", "Group name");
  input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      const value = input.value.trim();
      if (value) await renameLinkGroup(group.id, value);
      endRenameLinkGroup(onChange);
    } else if (e.key === "Escape") {
      endRenameLinkGroup(onChange);
    }
  });
  input.addEventListener("blur", () => endRenameLinkGroup(onChange));
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
  return input;
}

// Hovering a group (outside its rows) drops into that group; hovering anywhere else in the
// list drops at the end of the main list.
function resolveLinkDropZone(el) {
  const group = el.closest(".link-group");
  if (group) return { parent: group.querySelector(".link-group__links"), before: null };
  const list = el.closest(".link-list");
  if (!list || el.closest(".link-groups")) return null;
  return { parent: list, before: list.querySelector(":scope > .link-list__add-tile, :scope > .link-groups") };
}

function dropGroupId(parent) {
  return parent.closest(".link-group")?.dataset.groupId ?? null;
}

function buildLinkGroup(group, tab, launchIndexById, onChange) {
  const section = document.createElement("section");
  section.className = "link-group";
  section.dataset.groupId = group.id;

  const links = document.createElement("div");
  links.className = "link-group__links";

  linksInGroup(tab.id, group.id).forEach((link) => {
    links.appendChild(
      buildLinkRow(link, { compact: true, launchIndex: launchIndexById.get(link.id), onChange })
    );
  });

  section.append(buildGroupLabel(group, onChange), links);
  return section;
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

  const links = searching ? getSearchMatches().map((m) => m.link) : linksInGroup(tab.id, null);
  const splitThreshold = state.settings.linkListSplitThreshold;
  list.classList.toggle("link-list--split", splitThreshold !== null && links.length >= splitThreshold);

  const launchBar = searching ? null : buildLaunchBar(tab);
  if (launchBar) list.appendChild(launchBar);
  const launchIndexById = searching
    ? new Map()
    : new Map(launchGroupLinks(tab.id).map((l, i) => [l.id, i + 1]));

  links.forEach((link) => {
    list.appendChild(
      buildLinkRow(link, {
        searching,
        launchIndex: launchIndexById.get(link.id),
        tabName: tabNameByLinkId?.get(link.id),
        onChange,
      })
    );
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

  const groups = searching ? [] : linkGroupsForTab(tab.id);
  if (groups.length) {
    const row = document.createElement("div");
    row.className = "link-groups";
    groups.forEach((group) => row.appendChild(buildLinkGroup(group, tab, launchIndexById, onChange)));
    list.appendChild(row);
  }

  if (isNew) {
    makeSortable(list, {
      selector: ".link-list__row",
      resolveDropZone: resolveLinkDropZone,
      onMove: (row, ghost) => {
        const compact = !!dropGroupId(row.parentElement);
        row.classList.toggle("link-list__row--compact", compact);
        ghost.classList.toggle("link-list__row--compact", compact);
      },
      onReorder: async (linkId, index, parent) => {
        const currentTab = activeTab();
        if (!currentTab) return;
        await reorderLink(linkId, currentTab.id, index, dropGroupId(parent));
        onChange();
      },
    });
  }
}
