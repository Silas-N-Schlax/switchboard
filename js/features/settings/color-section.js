import { ambientMode, updateAmbient } from "./store.js";
import { buildRow, buildToggleSwitch } from "./controls.js";
import { resolveColors } from "../../render/ambient.js";
import { ambientPalettePresets } from "../../../defaults.js";

const CUSTOM_PALETTE_ID = "custom";

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

  select.value = ambientMode().paletteId;
  select.addEventListener("change", () => onChange(select.value));
  return select;
}

function buildColorSwatches(onChange) {
  const group = document.createElement("div");
  group.className = "settings-panel__swatch-group";

  const inputs = [0, 1, 2, 3].map((index) => {
    const input = document.createElement("input");
    input.type = "color";
    input.className = "color-swatch-input";
    input.setAttribute("aria-label", `Cycle color ${index + 1}`);
    input.addEventListener("input", () => {
      const customColors = [...resolveColors(ambientMode())];
      customColors[index] = input.value;
      onChange({ customColors });
    });
    group.appendChild(input);
    return input;
  });

  function refresh() {
    const colors = resolveColors(ambientMode());
    const isCustom = ambientMode().paletteId === CUSTOM_PALETTE_ID;
    const cycleOn = ambientMode().colorCycleEnabled;
    inputs.forEach((input, index) => {
      input.value = colors[index];
      // Editable at all only in Custom; within Custom, colors 2-4 only matter when the
      // cycle is on (the first color is always the active one otherwise).
      input.disabled = !isCustom || (index > 0 && !cycleOn);
    });
  }

  return { group, refresh };
}

export function buildColorSection() {
  const section = document.createElement("div");
  section.className = "settings-panel__section";
  const title = document.createElement("div");
  title.className = "settings-panel__section-title";
  title.textContent = "Color cycle";

  const { group: swatchGroup, refresh: refreshSwatches } = buildColorSwatches(updateAmbient);

  const { element: cycleToggle, input: cycleInput } = buildToggleSwitch(
    ambientMode().colorCycleEnabled,
    (checked) => {
      updateAmbient({ colorCycleEnabled: checked });
      refreshSwatches();
    }
  );
  const cycleRow = buildRow({ labelText: "Cycle through colors", control: cycleToggle });

  const paletteSelect = buildPaletteSelect((paletteId) => {
    updateAmbient({ paletteId });
    refreshSwatches();
  });
  const paletteRow = buildRow({ labelText: "Palette", control: paletteSelect });

  section.append(title, paletteRow, cycleRow, swatchGroup);

  function refresh() {
    cycleInput.checked = ambientMode().colorCycleEnabled;
    paletteSelect.value = ambientMode().paletteId;
    refreshSwatches();
  }
  refresh();

  return { element: section, refresh };
}
