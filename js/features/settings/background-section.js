// "Background" section: a style picker (one option per entry in the backgrounds
// registry) plus shared count/size/speed sliders. Each style declares which sliders
// apply via its `controls`; the rest are disabled. Count is floored above 0
// (bubbleCountMin) so only picking "None" removes the effect.

import { ambientMode, updateAmbient } from "./store.js";
import { buildRow, buildRange, buildSelect } from "./controls.js";
import { buildDialogGroup } from "../dialog/chrome.js";
import { backgrounds, findBackground } from "../../render/backgrounds/index.js";
import {
  bubbleCountMin,
  bubbleSizeMultiplierMin,
  bubbleSpeedMultiplierMin,
  bubbleSpeedMultiplierMax,
} from "../../../defaults.js";

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
    value: ambientMode().bubbleSizeMultiplier,
    onChange: (value) => updateAmbient({ bubbleSizeMultiplier: value }),
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

  function syncControlRows(backgroundId) {
    const { controls } = findBackground(backgroundId);
    Object.entries(controlRows).forEach(([key, row]) => {
      const disabled = !controls.includes(key);
      row.classList.toggle("settings-panel__row--disabled", disabled);
      row.querySelector("input").disabled = disabled;
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
    rows: [styleRow, ...Object.values(controlRows)],
  });

  function refresh() {
    styleSelect.setValue(ambientMode().backgroundType);
    syncControlRows(ambientMode().backgroundType);
    countRange.value = String(ambientMode().bubbleCount);
    sizeRange.value = String(ambientMode().bubbleSizeMultiplier);
    speedRange.value = String(ambientMode().bubbleSpeedMultiplier);
  }
  refresh();

  return { element: group, refresh };
}
