import { searchLinks } from "./store.js";
import { registerKeybind, getKeybind } from "../../shared/keybinds/registry.js";
import { buildShortcutBadges } from "../../shared/keybinds/shortcutBadges.js";
import { activeTab, isHomeTab, setActiveTab, sortedTabs } from "../tabLinks/store.js";
import {
  setSearchQuery,
  clearSearchQuery,
  getSearchMatches,
  getActiveMatch,
  moveActiveMatch,
} from "./state.js";
import { highlightActiveSearchRow } from "../tabLinks/renderLinks.js";
import { searchEngines } from "../../defaults.js";
import { recordEvent, recordLinkOpen, StatEvent } from "../stats/recorder.js";
import { openUrl, opensInNewTab } from "../tabLinks/openUrl.js";
import { state } from "../../core/state.js";

const hasSearchApi = typeof chrome !== "undefined" && !!chrome.search?.query;

function searchEngine() {
  const engine = searchEngines.find((e) => e.id === state.settings.searchEngineId) ?? searchEngines[0];
  // Served outside the extension (for UI work) there's no browser engine to hand off to.
  return engine.url || hasSearchApi ? engine : searchEngines.find((e) => e.url);
}

function searchWeb(query) {
  const engine = searchEngine();
  if (engine.url) return openUrl(engine.url + encodeURIComponent(query));
  return chrome.search.query({ text: query, disposition: opensInNewTab() ? "NEW_TAB" : "CURRENT_TAB" });
}

let barEl = null;
let inputEl = null;
let hintEl = null;
let onChangeRef = null;
// With the Search bar switch off, the search key brings the bar up until Esc or blur.
let summoned = false;

function updateFallbackMode() {
  const query = inputEl.value.trim();
  barEl.classList.toggle("search-bar--fallback-mode", query.length > 0 && getSearchMatches().length === 0);
}

function updateHint() {
  const focused = document.activeElement === inputEl;
  hintEl.replaceChildren(...buildShortcutBadges(focused ? "esc" : getKeybind("search-focus")).children);
}

function build(container) {
  barEl = document.createElement("div");
  barEl.className = "search-bar";

  inputEl = document.createElement("input");
  inputEl.type = "text";
  inputEl.name = "search";
  inputEl.className = "search-bar__input";
  inputEl.placeholder = "Search…";
  inputEl.autocomplete = "off";
  inputEl.spellcheck = false;

  hintEl = document.createElement("span");
  hintEl.className = "shortcut-badges search-bar__hint";

  inputEl.addEventListener("input", () => {
    setSearchQuery(inputEl.value, searchLinks(inputEl.value));
    updateFallbackMode();
    updateHint();
    onChangeRef?.();
  });

  inputEl.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = inputEl.value.trim();
      if (!query) return;
      const active = getActiveMatch();
      if (active) {
        recordEvent(StatEvent.search, { outcome: "link" });
        await recordLinkOpen(active.link, "search");
        openUrl(active.link.url);
      } else {
        await recordEvent(StatEvent.search, { outcome: "web", engine: searchEngine().id });
        searchWeb(query);
      }
    } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && getSearchMatches().length) {
      e.preventDefault();
      e.stopPropagation();
      moveActiveMatch(e.key === "ArrowDown" ? 1 : -1);
      highlightActiveSearchRow();
    } else if (e.key === "Escape") {
      inputEl.value = "";
      clearSearchQuery();
      updateFallbackMode();
      inputEl.blur();
      updateHint();
      onChangeRef?.();
    }
  });

  inputEl.addEventListener("focus", updateHint);
  inputEl.addEventListener("blur", (e) => {
    updateHint();
    // Moving into the results (arrow keys, Tab) keeps a summoned bar up.
    if (!summoned || e.relatedTarget?.closest?.(".link-list")) return;
    summoned = false;
    if (state.settings.showSearchBar) return;
    inputEl.value = "";
    clearSearchQuery();
    updateFallbackMode();
    onChangeRef?.();
  });

  registerKeybind("search-focus", {
    description: "Focus search",
    handler: () => {
      const hidden = !isHomeTab(activeTab()) || !state.settings.showSearchBar;
      summoned = true;
      if (!isHomeTab(activeTab())) setActiveTab(sortedTabs()[0]?.id, "search");
      if (hidden) onChangeRef?.();
      inputEl.focus();
      inputEl.select();
    },
  });

  barEl.append(inputEl, hintEl);
  container.appendChild(barEl);
}

export function focusSearchBar() {
  if (barEl && !barEl.classList.contains("search-bar--hidden")) inputEl.focus();
}

export function renderSearch(container, onChange) {
  onChangeRef = onChange;
  if (!barEl) build(container);
  updateHint();
  barEl.style.setProperty("--search-fallback-border", state.settings.searchFallbackColor);
  barEl.classList.toggle("search-bar--hidden", !isHomeTab(activeTab()) || (!state.settings.showSearchBar && !summoned));
}
