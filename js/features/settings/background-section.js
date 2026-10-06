// "Background" section: a style picker (one option per entry in the backgrounds
// registry) plus shared count/size/speed sliders. Each style declares which sliders
// apply via its `controls`, and may add on/off `toggles` shown only while it's picked.
// Count is floored above 0
// (bubbleCountMin) so only picking "None" removes the effect.

import { ambientMode, updateAmbient } from "./store.js";
import { buildRow, buildRange, buildSelect, buildToggleSwitch } from "./controls.js";
import { buildDialogGroup } from "../dialog/chrome.js";
import { backgrounds, findBackground, sizeSettingKey } from "../../render/backgrounds/index.js";
import {
  bubbleCountMin,
  bubbleSizeMultiplierMin,
  bubbleSpeedMultiplierMin,
  bubbleSpeedMultiplierMax,
} from "../../../defaults.js";

function sizeKey() {
  return sizeSettingKey(findBackground(ambientMode().backgroundType));
}

export function buildBackgroundSection() {
  const countRange = buildRange({
    min: bubbleCountMin,
    max: 30,
    step: 1,
    value: ambientMode().bubbleCount,
    onChange: (value) => updateAmbient({ bubbleCount: value }),
  });

  const sizeRange = buildRange({
    min: bubbleSizeMultiplierMin,
    max: 1,
    step: 0.05,
    value: ambientMode()[sizeKey()],
    onChange: (value) => updateAmbient({ [sizeKey()]: value }),
  });

  const speedRange = buildRange({
    min: bubbleSpeedMultiplierMin,
    max: bubbleSpeedMultiplierMax,
    step: 0.1,
    value: ambientMode().bubbleSpeedMultiplier,
    onChange: (value) => updateAmbient({ bubbleSpeedMultiplier: value }),
  });

  const controlRows = {
    count: buildRow({ labelText: "Count", control: countRange }),
    size: buildRow({ labelText: "Size", control: sizeRange }),
    speed: buildRow({ labelText: "Speed", control: speedRange }),
  };

  const toggleRows = backgrounds.flatMap((background) =>
    (background.toggles ?? []).map(({ key, label }) => {
      const toggle = buildToggleSwitch(ambientMode()[key], (checked) => updateAmbient({ [key]: checked }));
      return { backgroundId: background.id, key, input: toggle.input, row: buildRow({ labelText: label, control: toggle.element }) };
    })
  );

  function syncControlRows(backgroundId) {
    const background = findBackground(backgroundId);
    const { controls } = background;
    sizeRange.value = String(ambientMode()[sizeSettingKey(background)]);
    Object.entries(controlRows).forEach(([key, row]) => {
      const disabled = !controls.includes(key);
      row.classList.toggle("settings-panel__row--disabled", disabled);
      row.querySelector("input").disabled = disabled;
    });
    toggleRows.forEach(({ backgroundId: owner, key, input, row }) => {
      row.hidden = owner !== backgroundId;
      input.checked = ambientMode()[key];
    });
  }

  const styleSelect = buildSelect({
    options: backgrounds.map(({ id, label }) => ({ value: id, label })),
    value: ambientMode().backgroundType,
    onChange: (value) => {
      syncControlRows(value);
      updateAmbient({ backgroundType: value });
    },
  });
  const styleRow = buildRow({ labelText: "Style", control: styleSelect.element });

  const { group } = buildDialogGroup({
    label: "Background style",
    rows: [styleRow, ...Object.values(controlRows), ...toggleRows.map(({ row }) => row)],
  });

  function refresh() {
    styleSelect.setValue(ambientMode().backgroundType);
    syncControlRows(ambientMode().backgroundType);
    countRange.value = String(ambientMode().bubbleCount);
    sizeRange.value = String(ambientMode()[sizeKey()]);
    speedRange.value = String(ambientMode().bubbleSpeedMultiplier);
  }
  refresh();

  return { element: group, refresh };
}
