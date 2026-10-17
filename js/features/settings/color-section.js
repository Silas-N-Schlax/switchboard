import { ambientMode, updateAmbient } from "./store.js";
import { buildRow, buildToggleSwitch, buildSelect } from "./controls.js";
import { createSwatchPicker } from "./swatch-picker.js";
import {
  importedFiles,
  importedPalettes,
  availableSwatches,
  parsePaletteFile,
  addPaletteFile,
  removePaletteFile,
} from "./colorLibrary.js";
import { buildDialogGroup } from "../dialog/chrome.js";
import { alertDialog } from "../dialog/confirm.js";
import { showToast } from "../dialog/toast.js";
import { renderAmbient, resolveColors } from "../../render/ambient.js";
import { state } from "../../state.js";
import { ambientPalettePresets, ambientPaletteId, ambientSegmentHourOptions } from "../../../defaults.js";

const CUSTOM_PALETTE_ID = "custom";

function currentColors() {
  return resolveColors(ambientMode(), importedPalettes());
}

// A stored id can outlive its palette (e.g. the removed "Daylight", or a cleared import);
// resolveColors already falls back to the default colors, so the select just needs to
// show the same thing.
function selectablePaletteId() {
  const id = ambientMode().paletteId;
  const known =
    id === CUSTOM_PALETTE_ID || [...ambientPalettePresets, ...importedPalettes()].some((p) => p.id === id);
  return known ? id : ambientPaletteId;
}

function paletteOption(palette) {
  const option = document.createElement("option");
  option.value = palette.id;
  option.textContent = palette.name;
  return option;
}

function buildPaletteSelect(onChange) {
  const select = document.createElement("select");
  select.name = "palette";
  select.className = "select-input";

  let filledFor = null;

  function fill() {
    // Only rebuilt when the imported palettes change, not on every refresh.
    const key = importedPalettes().map((p) => `${p.id}:${p.name}`).join("|");
    if (key === filledFor) {
      select.value = selectablePaletteId();
      return;
    }
    filledFor = key;
    select.replaceChildren(...ambientPalettePresets.map(paletteOption));
    if (importedPalettes().length) {
      const imported = document.createElement("optgroup");
      imported.label = "Imported";
      imported.append(...importedPalettes().map(paletteOption));
      select.appendChild(imported);
    }
    select.appendChild(paletteOption({ id: CUSTOM_PALETTE_ID, name: "Custom" }));
    select.value = selectablePaletteId();
  }

  fill();
  select.addEventListener("change", () => onChange(select.value));
  return { element: select, refresh: fill };
}

function buildColorSwatches(onChange) {
  const group = document.createElement("div");
  group.className = "settings-panel__swatch-group";
  let pickers = [];
  let builtFor = null;

  // Pickers bake their swatch pages in when built, so they're rebuilt after an import.
  function build() {
    const swatches = availableSwatches();
    builtFor = swatches.length;
    pickers = [0, 1, 2, 3].map((index) =>
      createSwatchPicker({
        ariaLabel: `Cycle color ${index + 1}`,
        value: currentColors()[index],
        swatches,
        onChange: (hex) => {
          const customColors = [...currentColors()];
          customColors[index] = hex;
          onChange({ customColors });
        },
      })
    );
    group.replaceChildren(...pickers.map((picker) => picker.element));
  }

  function refresh() {
    if (builtFor !== availableSwatches().length) build();
    const colors = currentColors();
    const isCustom = ambientMode().paletteId === CUSTOM_PALETTE_ID;
    const cycleOn = ambientMode().colorCycleEnabled;
    pickers.forEach((picker, index) => {
      picker.setValue(colors[index]);
      // Editable at all only in Custom; within Custom, colors 2-4 only matter when the
      // cycle is on (the first color is always the active one otherwise).
      picker.setDisabled(!isCustom || (index > 0 && !cycleOn));
    });
  }

  return { group, refresh };
}

function pluralize(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function countsText(palettes, colors) {
  return [palettes && pluralize(palettes, "palette"), colors && pluralize(colors, "color")].filter(Boolean);
}

function buildActionButton(text, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "settings-panel__action";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

async function importPaletteFile(file) {
  let parsed;
  try {
    parsed = parsePaletteFile(file.name, await file.text());
  } catch (err) {
    await alertDialog({ title: "Can't import that file", message: err.message });
    return false;
  }
  const added = await addPaletteFile(file.name, parsed);
  const parts = countsText(added.palettes, added.swatches);
  if (!parts.length) {
    showToast(added.overLimit ? "Imported colors are full; clear them to add more" : "Those colors are already here");
    return false;
  }
  const notes = [added.overLimit && "some didn't fit", parsed.skippedPalettes && "palettes under 4 colors skipped"];
  const suffix = notes.filter(Boolean).join("; ");
  showToast(`Added ${parts.join(" and ")}${suffix ? ` (${suffix})` : ""}`, { tone: "success" });
  return true;
}

function buildFileRow(file, onRemove) {
  const counts = document.createElement("span");
  counts.className = "settings-panel__label";
  counts.textContent = countsText(file.palettes.length, file.swatches.length).join(" and ");
  const removeButton = buildActionButton("Remove", () => onRemove(file));
  removeButton.classList.add("settings-panel__action--danger");
  removeButton.setAttribute("aria-label", `Remove ${file.name}`);
  const controls = document.createElement("div");
  controls.className = "settings-panel__inline";
  controls.append(counts, removeButton);
  const row = buildRow({ labelText: file.name, control: controls, tag: "div" });
  row.classList.add("settings-panel__row--file");
  return row;
}

function buildLibraryRows(onLibraryChange) {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.name = "palette-file";
  fileInput.accept = ".json,.hex,.txt,.gpl,application/json,text/plain";
  fileInput.hidden = true;
  fileInput.addEventListener("change", async () => {
    const [file] = fileInput.files;
    fileInput.value = "";
    if (file && (await importPaletteFile(file))) onLibraryChange();
  });
  const importButton = buildActionButton("Import", () => fileInput.click());
  const importRow = buildRow({ labelText: "Add a palette file", control: importButton, tag: "div" });
  importRow.appendChild(fileInput);

  let fileRows = [];

  async function remove(file) {
    await removePaletteFile(file.id);
    renderAmbient(document.body, state.settings);
    onLibraryChange();
    importButton.focus();
    showToast(`Removed ${file.name}`);
  }

  // File rows sit right after the import row, as direct children of the group's panel
  // so they pick up its row dividers.
  function refresh() {
    fileRows.forEach((row) => row.remove());
    fileRows = importedFiles().map((file) => buildFileRow(file, remove));
    importRow.after(...fileRows);
  }

  return { importRow, refresh };
}

export function buildColorSection() {
  const { group: swatchGroup, refresh: refreshSwatches } = buildColorSwatches(updateAmbient);

  const segmentSelect = buildSelect({
    options: ambientSegmentHourOptions.map((hours) => ({
      value: hours,
      label: `${hours} ${hours === 1 ? "hour" : "hours"}`,
    })),
    value: ambientMode().segmentHours,
    onChange: (segmentHours) => updateAmbient({ segmentHours }),
  });
  const segmentRow = buildRow({ labelText: "Time per color", control: segmentSelect.element });

  function refreshSegmentRow() {
    const cycleOn = ambientMode().colorCycleEnabled;
    segmentRow.classList.toggle("settings-panel__row--disabled", !cycleOn);
    segmentSelect.element.disabled = !cycleOn;
    segmentSelect.setValue(ambientMode().segmentHours);
  }

  const { element: cycleToggle, input: cycleInput } = buildToggleSwitch(
    ambientMode().colorCycleEnabled,
    (checked) => {
      updateAmbient({ colorCycleEnabled: checked });
      refreshSwatches();
      refreshSegmentRow();
    }
  );
  const cycleRow = buildRow({ labelText: "Cycle through colors", control: cycleToggle });

  const paletteSelect = buildPaletteSelect((paletteId) => {
    updateAmbient({ paletteId });
    refreshSwatches();
  });
  const paletteRow = buildRow({ labelText: "Palette", control: paletteSelect.element });

  const colorsRow = buildRow({ labelText: "Colors", control: swatchGroup, tag: "div" });
  const library = buildLibraryRows(() => refresh());
  const { group } = buildDialogGroup({
    label: "Background",
    rows: [paletteRow, cycleRow, segmentRow, colorsRow, library.importRow],
    note:
      "Palette files can be JSON, a list of hex colors (.hex, .txt), or a GIMP palette " +
      "(.gpl). Four-color palettes join the Palette list, and every color joins the swatches.",
  });

  function refresh() {
    cycleInput.checked = ambientMode().colorCycleEnabled;
    paletteSelect.refresh();
    refreshSwatches();
    refreshSegmentRow();
    library.refresh();
  }
  refresh();

  return { element: group, refresh };
}
