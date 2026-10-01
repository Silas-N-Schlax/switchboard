// "Bubbles" section: show/hide toggle + count/size/speed sliders. Count is floored
// above 0 (bubbleCountMin) so the slider alone can never zero the bubbles out — the
// "Show bubbles" toggle is the actual off switch.

import { ambientMode, updateAmbient } from "./store.js";
import { buildRow, buildToggleSwitch, buildRange } from "./controls.js";
import { buildDialogGroup } from "../dialog/chrome.js";
import {
  bubbleCountMin,
  bubbleSizeMultiplierMin,
  bubbleSpeedMultiplierMin,
  bubbleSpeedMultiplierMax,
} from "../../../defaults.js";

export function buildBubblesSection() {
  const rows = [];

  const countRange = buildRange({
    min: bubbleCountMin,
    max: 30,
    step: 1,
    value: ambientMode().bubbleCount,
    onChange: (value) => updateAmbient({ bubbleCount: value }),
  });
  rows.push(buildRow({ labelText: "Count", control: countRange }));

  const sizeRange = buildRange({
    min: bubbleSizeMultiplierMin,
    max: 1,
    step: 0.05,
    value: ambientMode().bubbleSizeMultiplier,
    onChange: (value) => updateAmbient({ bubbleSizeMultiplier: value }),
  });
  rows.push(buildRow({ labelText: "Size", control: sizeRange }));

  const speedRange = buildRange({
    min: bubbleSpeedMultiplierMin,
    max: bubbleSpeedMultiplierMax,
    step: 0.1,
    value: ambientMode().bubbleSpeedMultiplier,
    onChange: (value) => updateAmbient({ bubbleSpeedMultiplier: value }),
  });
  rows.push(buildRow({ labelText: "Speed", control: speedRange }));

  function setRowsDisabled(disabled) {
    rows.forEach((row) => {
      row.classList.toggle("settings-panel__row--disabled", disabled);
      row.querySelector("input").disabled = disabled;
    });
  }

  const { element: bubblesToggle, input: bubblesInput } = buildToggleSwitch(
    ambientMode().bubblesEnabled,
    (checked) => {
      setRowsDisabled(!checked);
      updateAmbient({ bubblesEnabled: checked });
    }
  );
  const bubblesRow = buildRow({ labelText: "Show bubbles", control: bubblesToggle });

  const { group } = buildDialogGroup({ label: "Bubbles", rows: [bubblesRow, ...rows] });

  function refresh() {
    bubblesInput.checked = ambientMode().bubblesEnabled;
    setRowsDisabled(!ambientMode().bubblesEnabled);
    countRange.value = String(ambientMode().bubbleCount);
    sizeRange.value = String(ambientMode().bubbleSizeMultiplier);
    speedRange.value = String(ambientMode().bubbleSpeedMultiplier);
  }
  refresh();

  return { element: group, refresh };
}
