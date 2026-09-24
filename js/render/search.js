import { searchLinks } from "../features/search/store.js";
import { registerKeybind, getKeybind } from "../features/keybinds/registry.js";
import { activeTab, isHomeTab } from "../features/tabLinks/store.js";
import { setSearchQuery, clearSearchQuery, getSearchMatches } from "../features/search/state.js";
import { searchGoogleModeColor } from "../../defaults.js";

function googleSearchUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

let barEl = null;
let inputEl = null;
let hintEl = null;
let onChangeRef = null;

function go(url) {
  window.location.href = url;
}

function updateGoogleMode() {
  const query = inputEl.value.trim();
  barEl.classList.toggle("search-bar--google-mode", query.length > 0 && getSearchMatches().length === 0);
}

function updateHint() {
  const focused = document.activeElement === inputEl;
  hintEl.textContent = focused ? "esc" : getKeybind("search-focus") ?? "";
}

function build(container) {
  barEl = document.createElement("div");
  barEl.className = "search-bar";
  barEl.style.setProperty("--search-google-border", searchGoogleModeColor);

  inputEl = document.createElement("input");
  inputEl.type = "text";
  inputEl.className = "search-bar__input";
  inputEl.placeholder = "Search your links…";
  inputEl.autocomplete = "off";
  inputEl.spellcheck = false;

  hintEl = document.createElement("span");
  hintEl.className = "keybind-badge search-bar__hint";

  inputEl.addEventListener("input", () => {
    setSearchQuery(inputEl.value, searchLinks(inputEl.value));
    updateGoogleMode();
    updateHint();
    onChangeRef?.();
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = inputEl.value.trim();
      if (!query) return;
      const top = getSearchMatches()[0];
      go(top ? top.link.url : googleSearchUrl(query));
    } else if (e.key === "Escape") {
      inputEl.value = "";
      clearSearchQuery();
      updateGoogleMode();
      inputEl.blur();
      updateHint();
      onChangeRef?.();
    }
  });

  inputEl.addEventListener("focus", updateHint);
  inputEl.addEventListener("blur", updateHint);

  registerKeybind("search-focus", {
    description: "Focus search",
    handler: () => {
      if (!isHomeTab(activeTab())) return;
      inputEl.focus();
      inputEl.select();
    },
  });

  barEl.append(inputEl, hintEl);
  container.appendChild(barEl);
}

export function renderSearch(container, onChange) {
  onChangeRef = onChange;
  if (!barEl) build(container);
  updateHint();
  barEl.classList.toggle("search-bar--hidden", !isHomeTab(activeTab()));
}
