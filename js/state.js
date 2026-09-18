export const state = {
  tabs: [],
  links: [],
  settings: null,
  activeTabId: null,
};

export function setState(partial) {
  Object.assign(state, partial);
}
