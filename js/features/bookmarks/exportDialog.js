import { openDialog } from "../dialog/confirm.js";
import { el, pluralize, buildCheckbox, buildCheckLabel, buildSelectAll } from "./dom.js";
import {
  exportableTabs,
  buildExportTree,
  countBookmarks,
  defaultRootFolder,
  existingWrapper,
  wrapperFolderName,
} from "./exportStore.js";
import { BookmarkTarget } from "./chooser.js";

let selectCount = 0;

function countFolders(nodes) {
  return nodes.reduce((sum, node) => (node.url ? sum : sum + 1 + countFolders(node.children)), 0);
}

function buildRootSelect(roots, value, onChange) {
  selectCount += 1;
  const select = el("select", "select-input");
  select.name = `bookmark-export-root-${selectCount}`;
  select.append(
    ...roots.map((root) => {
      const option = el("option", null, root.title);
      option.value = root.id;
      return option;
    })
  );
  select.value = value;
  select.addEventListener("change", () => onChange(select.value));
  return select;
}

function buildTabRow(row, onChange) {
  const { tab, groups } = row.entry;
  const item = el("div", "bookmark-dialog__folder");

  const include = buildCheckbox("include", row.include, (checked) => {
    row.include = checked;
    onChange();
  });
  const title = el("label", "bookmark-dialog__title");
  title.append(
    include,
    el("span", "bookmark-dialog__name", tab.name),
    el("span", "bookmark-dialog__count", pluralize(row.entry.linkCount, "link"))
  );

  const ownFolder = buildCheckbox("tab-folder", row.ownFolder, (checked) => {
    row.ownFolder = checked;
    onChange();
  });
  const groupFolders = buildCheckbox("group-folders", row.groupFolders, (checked) => {
    row.groupFolders = checked;
    onChange();
  });
  const options = el("div", "bookmark-dialog__options");
  options.append(buildCheckLabel("bookmark-dialog__option", ownFolder, "Its own folder"));
  if (groups.length) {
    options.append(
      buildCheckLabel("bookmark-dialog__option", groupFolders, `A folder per link group (${groups.length})`)
    );
  }
  item.append(title, options);

  function sync() {
    item.classList.toggle("bookmark-dialog__folder--skipped", !row.include);
    include.checked = row.include;
    ownFolder.disabled = !row.include;
    groupFolders.disabled = !row.include;
  }
  return { item, sync };
}

export function exportBookmarksDialog({ target, roots = [], browserLabel }) {
  const rows = exportableTabs()
    .filter((entry) => entry.linkCount > 0)
    .map((entry) => ({ entry, include: true, ownFolder: true, groupFolders: entry.groups.length > 0 }));
  const options = { wrap: true, rootId: defaultRootFolder(roots)?.id ?? null, replace: false };
  const toBrowser = target === BookmarkTarget.browser;

  const rootById = (id) => roots.find((r) => r.id === id);
  const wrapperToReplace = () =>
    toBrowser && options.wrap && options.replace ? existingWrapper(rootById(options.rootId)) : null;

  return openDialog({
    title: "Export bookmarks",
    message: toBrowser
      ? `Pick the tabs to add to ${browserLabel}'s bookmarks. Each tab can be its own folder, with a ` +
        "folder inside it for each link group."
      : "Pick the tabs to put in the file. Each tab can be its own folder, with a folder inside it " +
        "for each link group. Any browser's bookmark manager can import the file.",
    buttons: [
      { text: "Cancel", variant: "ghost", result: false },
      { text: "Export", variant: "primary", result: true },
    ],
    className: "bookmark-dialog",
    role: "dialog",
    buildExtra: ({ buttonEls }) => {
      const exportButton = buttonEls[1];
      const wrap = el("div", "bookmark-dialog__body");
      const settings = el("div", "bookmark-dialog__settings");

      let rootRow = null;
      let rootSelect = null;
      if (toBrowser) {
        rootSelect = buildRootSelect(roots, options.rootId, (id) => {
          options.rootId = id;
          update();
        });
        rootRow = el("div", "bookmark-dialog__bulk");
        rootRow.append(el("span", "bookmark-dialog__bulk-label", "Save into"), rootSelect);
        settings.appendChild(rootRow);
      }

      const wrapBox = buildCheckbox("wrap", options.wrap, (checked) => {
        options.wrap = checked;
        update();
      });
      settings.appendChild(
        buildCheckLabel("bookmark-dialog__option", wrapBox, `Put everything in a “${wrapperFolderName}” folder`)
      );

      const replaceBox = buildCheckbox("replace", options.replace, (checked) => {
        options.replace = checked;
        update();
      });
      const replaceText = el("span");
      const replaceLabel = buildCheckLabel("bookmark-dialog__option", replaceBox, replaceText);
      settings.appendChild(replaceLabel);

      const selectAll = buildSelectAll("All tabs", rows, update);
      const list = el("div", "bookmark-dialog__list custom-scrollbar");
      const tabRows = rows.map((row) => buildTabRow(row, update));
      list.append(...tabRows.map((r) => r.item));

      const summary = el("p", "bookmark-dialog__summary");
      summary.setAttribute("role", "status");

      wrap.append(settings, selectAll.element, list, summary);

      function update() {
        tabRows.forEach((r) => r.sync());
        selectAll.sync("tab");

        const root = rootById(options.rootId);
        const existing = toBrowser && options.wrap ? existingWrapper(root) : null;
        replaceLabel.hidden = !existing;
        replaceText.textContent = `Replace the “${wrapperFolderName}” folder already in ${root?.title ?? ""}`;

        const tree = buildExportTree(rows, options);
        const links = countBookmarks(tree);
        const folders = countFolders(tree);
        const where = toBrowser ? ` in ${root?.title ?? "your bookmarks"}` : "";
        let text = links ? `${pluralize(links, "link")} in ${pluralize(folders, "folder")}${where}.` : "Nothing selected.";
        if (existing && !options.replace) text += ` A second “${wrapperFolderName}” folder is added next to the one there.`;
        if (existing && options.replace) text += " The old folder is removed once the new one is written.";
        summary.textContent = text;

        exportButton.textContent = links ? `${toBrowser ? "Add" : "Download"} ${pluralize(links, "link")}` : "Export";
        exportButton.disabled = !links;
      }
      update();

      return { element: wrap, focusEl: rootSelect ?? wrapBox };
    },
  }).then((confirmed) => {
    if (!confirmed) return null;
    return {
      tree: buildExportTree(rows, options),
      parentId: options.rootId,
      replaceId: wrapperToReplace()?.id ?? null,
    };
  });
}
