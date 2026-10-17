import { maxTabs } from "../../defaults.js";

export const tabSwitchIds = Array.from({ length: maxTabs }, (_, i) => `tab-switch-${i + 1}`);

export function tabSwitchSlot(id) {
  return id.startsWith("tab-switch-") ? Number(id.slice("tab-switch-".length)) : null;
}

// Every action a key can be bound to, grouped the way the shortcuts sheet and the
// keybind editor show them. Actions register their handlers elsewhere; this only names
// them, so the editor can list tab slots and unbound actions that aren't registered.
export const keybindSections = [
  {
    title: "Navigate",
    actions: [
      { id: "tab-prev", label: "Previous tab" },
      { id: "tab-next", label: "Next tab" },
      ...tabSwitchIds.map((id, i) => ({ id, label: `Switch to tab ${i + 1}` })),
      { id: "search-focus", label: "Focus search" },
    ],
  },
  {
    title: "Tabs",
    actions: [
      { id: "tab-new", label: "New tab" },
      { id: "tab-rename", label: "Rename this tab" },
      { id: "tab-duplicate", label: "Duplicate this tab" },
      { id: "tab-set-default", label: "Set or remove this tab as default" },
      { id: "tab-clear", label: "Clear this tab's links" },
      { id: "tab-delete", label: "Delete this tab" },
    ],
  },
  {
    title: "Links",
    actions: [
      { id: "link-new", label: "New link on this tab" },
      { id: "link-edit", label: "Edit the selected link" },
      { id: "link-delete", label: "Delete the selected link" },
      { id: "link-duplicate", label: "Duplicate the selected link" },
      { id: "link-copy-url", label: "Copy the selected link's URL" },
      { id: "link-open-new-tab", label: "Open the selected link in a new tab" },
      { id: "link-move-up", label: "Move the selected link up" },
      { id: "link-move-down", label: "Move the selected link down" },
    ],
  },
  {
    title: "Link groups",
    actions: [
      { id: "link-move-new-group", label: "Move the selected link to a new group" },
      { id: "link-move-main", label: "Move the selected link to the main list" },
      { id: "group-rename", label: "Rename the selected link's group" },
      { id: "group-move-left", label: "Move the selected link's group left" },
      { id: "group-move-right", label: "Move the selected link's group right" },
      { id: "group-ungroup", label: "Ungroup the selected link's group" },
    ],
  },
  {
    title: "Launch groups",
    actions: [
      { id: "launch-group", label: "Launch this tab's group" },
      { id: "launch-group-edit", label: "Edit the launch group" },
      { id: "link-launch-toggle", label: "Add or remove the selected link" },
      { id: "launch-group-clear", label: "Clear the launch group" },
    ],
  },
  {
    title: "General",
    actions: [
      { id: "settings-open", label: "Settings" },
      { id: "context-menu-open", label: "Open the menu for the selected item" },
      { id: "cheatsheet-open", label: "Show keyboard shortcuts" },
    ],
  },
];

export const keybindActions = keybindSections.flatMap((section) => section.actions);

export function keybindLabel(id) {
  return keybindActions.find((a) => a.id === id)?.label ?? id;
}
