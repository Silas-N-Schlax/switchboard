let renamingGroupId = null;

export function getRenamingLinkGroupId() {
  return renamingGroupId;
}

export function beginRenameLinkGroup(groupId, onChange) {
  renamingGroupId = groupId;
  onChange();
}

export function endRenameLinkGroup(onChange) {
  renamingGroupId = null;
  onChange();
}
