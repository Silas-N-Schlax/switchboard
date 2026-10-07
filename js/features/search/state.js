let query = "";
let matches = [];
let activeIndex = 0;

export function getSearchQuery() {
  return query;
}

export function getSearchMatches() {
  return matches;
}

export function getActiveMatchIndex() {
  return activeIndex;
}

export function getActiveMatch() {
  return matches[activeIndex];
}

export function moveActiveMatch(step) {
  activeIndex = Math.max(0, Math.min(matches.length - 1, activeIndex + step));
}

export function setSearchQuery(newQuery, newMatches) {
  query = newQuery;
  matches = newMatches;
  activeIndex = 0;
}

export function clearSearchQuery() {
  query = "";
  matches = [];
  activeIndex = 0;
}
