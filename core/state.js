export const state = {
  tabs: [],
  links: [],
  linkGroups: [],
  settings: null,
  activeTabId: null,
};

export function setState(partial) {
  Object.assign(state, partial);
}
