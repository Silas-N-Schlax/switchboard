import { ambientMode, updateAmbient } from "./store.js";
import { buildRow, buildToggleSwitch, buildSelect } from "./controls.js";
import { createSwatchPicker } from "./swatch-picker.js";
import { buildDialogGroup } from "../dialog/chrome.js";
import { resolveColors } from "../../render/ambient.js";
import { ambientPalettePresets, ambientPaletteId, ambientSegmentHourOptions } from "../../../defaults.js";

const CUSTOM_PALETTE_ID = "custom";

// A stored id can outlive its preset (e.g. the removed "Daylight"); resolveColors already
// falls back to the default colors, so the select just needs to show the same thing.
function selectablePaletteId() {
  const id = ambientMode().paletteId;
  const known = id === CUSTOM_PALETTE_ID || ambientPalettePresets.some((p) => p.id === id);
  return known ? id : ambientPaletteId;
}

function buildPaletteSelect(onChange) {
  const select = document.createElement("select");
  select.className = "select-input";

  ambientPalettePresets.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    select.appendChild(option);
  });
  const customOption = document.createElement("option");
  customOption.value = CUSTOM_PALETTE_ID;
  customOption.textContent = "Custom";
  select.appendChild(customOption);

  select.value = selectablePaletteId();
  select.addEventListener("change", () => onChange(select.value));
  return select;
}

function buildColorSwatches(onChange) {
  const group = document.createElement("div");
  group.className = "settings-panel__swatch-group";

  const pickers = [0, 1, 2, 3].map((index) => {
    const picker = createSwatchPicker({
      ariaLabel: `Cycle color ${index + 1}`,
      value: resolveColors(ambientMode())[index],
      onChange: (hex) => {
        const customColors = [...resolveColors(ambientMode())];
        customColors[index] = hex;
        onChange({ customColors });
      },
    });
    group.appendChild(picker.element);
    return picker;
  });

  function refresh() {
    const colors = resolveColors(ambientMode());
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
  const paletteRow = buildRow({ labelText: "Palette", control: paletteSelect });

  const colorsRow = buildRow({ labelText: "Colors", control: swatchGroup, tag: "div" });
  const { group } = buildDialogGroup({
    label: "Background",
    rows: [paletteRow, cycleRow, segmentRow, colorsRow],
  });

  function refresh() {
    cycleInput.checked = ambientMode().colorCycleEnabled;
    paletteSelect.value = selectablePaletteId();
    refreshSwatches();
    refreshSegmentRow();
  }
  refresh();

  return { element: group, refresh };
}
