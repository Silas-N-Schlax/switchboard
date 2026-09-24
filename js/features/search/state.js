let query = "";
let matches = [];

export function getSearchQuery() {
  return query;
}

export function getSearchMatches() {
  return matches;
}

export function setSearchQuery(newQuery, newMatches) {
  query = newQuery;
  matches = newMatches;
}

export function clearSearchQuery() {
  query = "";
  matches = [];
}
