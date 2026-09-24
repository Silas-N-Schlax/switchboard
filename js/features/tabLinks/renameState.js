let renamingTabId = null;

export function getRenamingTabId() {
  return renamingTabId;
}

export function beginRenameTab(tabId, onChange) {
  renamingTabId = tabId;
  onChange();
}

export function endRenameTab(onChange) {
  renamingTabId = null;
  onChange();
}
