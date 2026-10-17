import { openDialog } from "../../shared/dialog/confirm.js";
import { sortedTabs } from "../tabLinks/store.js";
import { createTabPicker } from "./tabPicker.js";
import {
  tabDestination,
  newTabDestination,
  newTabRoom,
  pendingNewTabs,
  defaultDestination,
  importProblems,
} from "./importStore.js";
import { maxTabs } from "../../defaults.js";
import { el, pluralize, buildCheckbox, buildCheckLabel, buildSelectAll } from "./dom.js";

const perFolderDestination = "per-folder";

function tabOptions(rows, extraDestinations = []) {
  const existing = sortedTabs().map((t) => ({ value: tabDestination(t.id), label: t.name }));
  const names = pendingNewTabs(rows);
  for (const destination of extraDestinations) {
    if (!destination?.startsWith("new:")) continue;
    const name = destination.slice("new:".length);
    const key = `new:${name.trim().toLowerCase()}`;
    if (!names.has(key)) names.set(key, name);
  }
  const pending = [...names.values()].map((name) => ({ value: newTabDestination(name), label: name, hint: "new tab" }));
  return [...existing, ...pending];
}

function createOption(name, room) {
  if (room > 0) return { value: newTabDestination(name), label: `Create tab “${name}”` };
  return { value: null, label: `No room for “${name}”: Switchboard holds ${maxTabs} tabs`, disabled: true };
}

function buildFolderRow(row, rows, onChange) {
  const item = el("div", "bookmark-dialog__folder");

  const include = buildCheckbox("include", row.include, (checked) => {
    row.include = checked;
    onChange();
  });
  const title = el("label", "bookmark-dialog__title");
  const name = el("span", "bookmark-dialog__name");
  const parents = row.folder.path.slice(0, -1);
  if (parents.length) name.append(el("span", "bookmark-dialog__parents", `${parents.join(" › ")} › `));
  name.append(row.folder.name);
  title.append(include, name, el("span", "bookmark-dialog__count", pluralize(row.folder.links.length, "link")));

  const room = () => newTabRoom() - pendingNewTabs(rows, row).size;
  const picker = createTabPicker({
    label: `Tab for ${row.folder.name}`,
    value: row.destination,
    getOptions: () => tabOptions(rows, [row.destination]),
    createOption: (typed) => createOption(typed, room()),
    onChange: (value) => {
      row.destination = value;
      onChange();
    },
  });

  const group = buildCheckbox("group", row.asGroup, (checked) => {
    row.asGroup = checked;
    onChange();
  });
  const groupToggle = buildCheckLabel("bookmark-dialog__option", group, "Link group");

  const options = el("div", "bookmark-dialog__options");
  options.append(picker.element, groupToggle);
  item.append(title, options);

  function sync() {
    item.classList.toggle("bookmark-dialog__folder--skipped", !row.include);
    include.checked = row.include;
    picker.setValue(row.destination);
    picker.setDisabled(!row.include);
    group.disabled = !row.include;
  }
  return { item, sync, picker };
}

function bulkValue(rows) {
  const included = rows.filter((r) => r.include);
  const destinations = new Set(included.map((r) => r.destination));
  if (destinations.size === 1) return [...destinations][0];
  if (included.length > 1 && included.every((r) => r.destination === newTabDestination(r.folder.name))) {
    return perFolderDestination;
  }
  return "";
}

function buildBulkPicker(rows, onChange) {
  const perFolderCount = () => new Set(rows.filter((r) => r.include).map((r) => r.folder.name.trim().toLowerCase())).size;
  return createTabPicker({
    label: "Tab for every folder",
    value: bulkValue(rows),
    placeholder: "Different per folder",
    getOptions: () => {
      const needed = perFolderCount();
      const room = newTabRoom();
      return [
        ...tabOptions(rows),
        {
          value: perFolderDestination,
          label: "A new tab per folder",
          hint: needed > room ? `needs ${needed}, room for ${room}` : null,
          disabled: needed > room,
        },
      ];
    },
    createOption: (typed) => createOption(typed, newTabRoom()),
    onChange: (value) => {
      rows.forEach((row) => {
        row.destination = value === perFolderDestination ? newTabDestination(row.folder.name) : value;
      });
      onChange();
    },
  });
}

export function importBookmarksDialog({ folders, skipped }) {
  const rows = folders.map((folder) => ({ folder, include: true, destination: defaultDestination(), asGroup: false }));
  const linkTotal = folders.reduce((sum, f) => sum + f.links.length, 0);
  let skippedNote = "";
  if (skipped === 1) skippedNote = " 1 link that isn't a web page (like a bookmarklet) is left out.";
  else if (skipped > 1) skippedNote = ` ${skipped} links that aren't web pages (like bookmarklets) are left out.`;
  const pickers = [];

  return openDialog({
    title: "Import bookmarks",
    message:
      `Found ${pluralize(linkTotal, "link")} in ${pluralize(folders.length, "folder")}. Pick a tab for each ` +
      `folder, or type a name to create one, and choose whether it becomes a link group named after ` +
      `the folder.${skippedNote} Links a tab already has are skipped.`,
    buttons: [
      { text: "Cancel", variant: "ghost", result: false },
      { text: "Import", variant: "primary", result: true },
    ],
    className: "bookmark-dialog",
    role: "dialog",
    buildExtra: ({ buttonEls }) => {
      const importButton = buttonEls[1];
      const wrap = el("div", "bookmark-dialog__body");

      const bulkLabel = el("div", "bookmark-dialog__bulk");
      const bulk = buildBulkPicker(rows, update);
      pickers.push(bulk);
      bulkLabel.append(el("span", "bookmark-dialog__bulk-label", "Send everything to"), bulk.element);

      const selectAll = buildSelectAll("All folders", rows, update);

      const list = el("div", "bookmark-dialog__list custom-scrollbar");
      const folderRows = rows.map((row) => buildFolderRow(row, rows, update));
      pickers.push(...folderRows.map((r) => r.picker));
      list.append(...folderRows.map((r) => r.item));

      const problemsEl = el("div", "bookmark-dialog__problems");
      problemsEl.setAttribute("role", "status");

      wrap.append(bulkLabel, selectAll.element, list, problemsEl);

      function update() {
        folderRows.forEach((r) => r.sync());
        const included = rows.filter((r) => r.include);
        selectAll.sync("folder");
        bulk.setValue(bulkValue(rows));

        const problems = importProblems(rows);
        problemsEl.replaceChildren(...problems.map((p) => el("p", "bookmark-dialog__problem", p)));

        const count = included.reduce((sum, r) => sum + r.folder.links.length, 0);
        importButton.textContent = count ? `Import ${pluralize(count, "link")}` : "Import";
        importButton.disabled = !count || problems.length > 0;
      }
      update();

      return { element: wrap, focusEl: bulk.input };
    },
  }).then((confirmed) => {
    pickers.forEach((p) => p.close());
    return confirmed ? rows : null;
  });
}
