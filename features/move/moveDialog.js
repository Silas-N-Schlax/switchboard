import { state } from "../../core/state.js";
import { openDialog } from "../../shared/dialog/confirm.js";
import { sortedTabs, linkGroupIdOf, linksInGroup } from "../tabLinks/store.js";
import {
  linkGroupsForTab,
  canAddLinkGroup,
  canMoveLinkToNewGroup,
  canMoveLinkGroupTo,
  moveLink,
  moveLinkGroup,
} from "../linkGroups/index.js";

const mainList = "main";
const newGroup = "new";
let fieldCount = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function pluralize(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function buildSelect(label, onChange) {
  fieldCount += 1;
  const select = el("select", "select-input");
  select.name = `move-${fieldCount}`;
  select.addEventListener("change", () => onChange(select.value));

  function setOptions(options, value) {
    select.replaceChildren(
      ...options.map((o) => {
        const option = el("option", null, o.label);
        option.value = o.value;
        option.disabled = !!o.disabled;
        return option;
      })
    );
    const usable = options.find((o) => o.value === value && !o.disabled) ?? options.find((o) => !o.disabled);
    select.value = usable?.value ?? "";
    return select.value;
  }

  const row = el("label", "move-dialog__row");
  row.append(el("span", "move-dialog__label", label), select);
  return { row, select, setOptions };
}

function buildTextField(label, value) {
  fieldCount += 1;
  const input = el("input", "move-dialog__input");
  input.type = "text";
  input.name = `move-${fieldCount}`;
  input.value = value;
  input.autocomplete = "off";
  input.spellcheck = false;
  const row = el("label", "move-dialog__row");
  row.append(el("span", "move-dialog__label", label), input);
  return { row, input };
}

function tabName(tabId) {
  return state.tabs.find((t) => t.id === tabId)?.name ?? "";
}

function openMoveDialog({ title, message, buildFields, confirmLabel = "Move" }) {
  let read = null;
  return openDialog({
    title,
    message,
    buttons: [
      { text: "Cancel", variant: "ghost", result: false },
      { text: confirmLabel, variant: "primary", result: true },
    ],
    className: "move-dialog",
    role: "dialog",
    buildExtra: ({ buttonEls, finish }) => {
      const body = el("div", "move-dialog__body");
      const fields = el("div", "move-dialog__fields");
      const note = el("p", "move-dialog__note");
      note.setAttribute("role", "status");
      body.append(fields, note);
      const built = buildFields({ fields, note, confirmButton: buttonEls[1] });
      read = built.read;
      body.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target.tagName === "INPUT" && !buttonEls[1].disabled) {
          e.preventDefault();
          finish(true);
        }
      });
      return { element: body, focusEl: built.focusEl };
    },
  }).then((confirmed) => (confirmed ? read() : null));
}

export async function openMoveLinkDialog(link, onChange) {
  const choice = await openMoveDialog({
    title: "Move link",
    message: `Move “${link.label}” to another tab, or to a different spot in this one.`,
    buildFields: ({ fields, note, confirmButton }) => {
      const current = { tabId: link.tabId, place: linkGroupIdOf(link) ?? mainList, position: "bottom" };

      const tab = buildSelect("Tab", (value) => {
        current.tabId = value;
        refresh();
      });
      const place = buildSelect("Put it in", (value) => {
        current.place = value;
        refresh();
      });
      const name = buildTextField("Group name", "New group");
      const position = buildSelect("Position", (value) => {
        current.position = value;
        refresh();
      });
      name.input.addEventListener("input", refresh);
      fields.append(tab.row, place.row, name.row, position.row);

      tab.setOptions(
        sortedTabs().map((t) => ({ value: t.id, label: t.id === link.tabId ? `${t.name} (current)` : t.name })),
        current.tabId
      );
      position.setOptions(
        [
          { value: "bottom", label: "At the bottom" },
          { value: "top", label: "At the top" },
        ],
        current.position
      );

      function refresh() {
        const groups = linkGroupsForTab(current.tabId);
        const groupFull = current.tabId === link.tabId ? !canMoveLinkToNewGroup(link) : !canAddLinkGroup(current.tabId);
        current.place = place.setOptions(
          [
            { value: mainList, label: "Main list" },
            ...groups.map((g) => ({ value: g.id, label: g.name })),
            {
              value: newGroup,
              label: groupFull ? `New group (tab holds ${state.settings.linkGroupLimit})` : "New group",
              disabled: groupFull,
            },
          ],
          current.place
        );
        name.row.hidden = current.place !== newGroup;

        const where =
          current.place === mainList
            ? "the main list"
            : current.place === newGroup
              ? `a new group called “${name.input.value.trim() || "New group"}”`
              : `“${groups.find((g) => g.id === current.place)?.name}”`;
        let text = `Goes to the ${current.position} of ${where} in ${tabName(current.tabId)}.`;
        if (current.tabId !== link.tabId && link.launchGroup) text += " It leaves this tab's launch group.";
        note.textContent = text;
        confirmButton.disabled = current.place === newGroup && !name.input.value.trim();
      }
      refresh();

      return {
        focusEl: tab.select,
        read: () => ({
          tabId: current.tabId,
          groupId:
            current.place === mainList ? null : current.place === newGroup ? { name: name.input.value.trim() } : current.place,
          position: current.position,
        }),
      };
    },
  });
  if (!choice) return;
  await moveLink(link.id, choice);
  onChange();
}

export async function openMoveGroupDialog(group, onChange) {
  const linkCount = linksInGroup(group.tabId, group.id).length;
  const choice = await openMoveDialog({
    title: "Move group",
    message: `Move “${group.name}” and its ${pluralize(linkCount, "link")} to another tab, or to a new spot in this one.`,
    buildFields: ({ fields, note }) => {
      const current = { tabId: group.tabId, index: linkGroupsForTab(group.tabId).findIndex((g) => g.id === group.id) };

      const tab = buildSelect("Tab", (value) => {
        current.tabId = value;
        current.index = Infinity;
        refresh();
      });
      const position = buildSelect("Position", (value) => {
        current.index = Number(value);
        refresh();
      });
      fields.append(tab.row, position.row);

      tab.setOptions(
        sortedTabs().map((t) => {
          if (t.id === group.tabId) return { value: t.id, label: `${t.name} (current)` };
          const full = !canMoveLinkGroupTo(group, t.id);
          return { value: t.id, label: full ? `${t.name} (full)` : t.name, disabled: full };
        }),
        current.tabId
      );

      function refresh() {
        const others = linkGroupsForTab(current.tabId).filter((g) => g.id !== group.id);
        const index = Math.min(current.index, others.length);
        current.index = Number(
          position.setOptions(
            [
              { value: "0", label: "First" },
              ...others.map((g, i) => ({ value: String(i + 1), label: `After “${g.name}”` })),
            ],
            String(index)
          )
        );
        const spot = current.index === 0 ? "first" : `after “${others[current.index - 1].name}”`;
        let text = `Goes ${spot} in ${tabName(current.tabId)}.`;
        const launching = linksInGroup(group.tabId, group.id).filter((l) => l.launchGroup).length;
        if (current.tabId !== group.tabId && launching) {
          text += ` ${pluralize(launching, "link")} leave${launching === 1 ? "s" : ""} this tab's launch group.`;
        }
        note.textContent = text;
      }
      refresh();

      return { focusEl: tab.select, read: () => ({ tabId: current.tabId, index: current.index }) };
    },
  });
  if (!choice) return;
  await moveLinkGroup(group.id, choice.tabId, choice.index);
  onChange();
}
