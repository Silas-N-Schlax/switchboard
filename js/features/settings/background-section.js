// "Background" section: a style picker (one option per entry in the backgrounds
// registry) plus count/size/speed sliders. Each style keeps its own slider values,
// declares which sliders apply via its `controls`, and may add its own `sliders` (rare
// sight frequency) and on/off `toggles`, shown only while it's picked. Count is floored above 0 (backgroundCountMin) so only
// picking "None" removes the effect.

import { ambientMode, backgroundStyle, updateAmbient, updateBackgroundStyle } from "./store.js";
import { buildRow, buildRange, buildSelect, buildToggleSwitch } from "./controls.js";
import { buildDialogGroup } from "../dialog/chrome.js";
import { backgrounds, findBackground } from "../../render/backgrounds/index.js";
import {
  backgroundCountMin,
  backgroundCountMax,
  backgroundSizeMin,
  backgroundSpeedMin,
  backgroundSpeedMax,
  rareFrequencyMin,
  rareFrequencyMax,
} from "../../../defaults.js";

function activeStyleId() {
  return ambientMode().backgroundType;
}

function activeStyle() {
  return backgroundStyle(activeStyleId());
}

function updateActiveStyle(partial) {
  return updateBackgroundStyle(activeStyleId(), partial);
}

export function buildBackgroundSection() {
  const ranges = {
    count: buildRange({
      min: backgroundCountMin,
      max: backgroundCountMax,
      step: 1,
      value: activeStyle().count,
      onChange: (value) => updateActiveStyle({ count: value }),
    }),
    size: buildRange({
      min: backgroundSizeMin,
      max: 1,
      step: 0.05,
      value: activeStyle().size,
      onChange: (value) => updateActiveStyle({ size: value }),
    }),
    speed: buildRange({
      min: backgroundSpeedMin,
      max: backgroundSpeedMax,
      step: 0.1,
      value: activeStyle().speed,
      onChange: (value) => updateActiveStyle({ speed: value }),
    }),
  };

  const controlRows = {
    count: buildRow({ labelText: "Count", control: ranges.count }),
    size: buildRow({ labelText: "Size", control: ranges.size }),
    speed: buildRow({ labelText: "Speed", control: ranges.speed }),
  };

  const styleRows = backgrounds.flatMap((background) => [
    ...(background.sliders ?? []).map(({ key, label }) => {
      const range = buildRange({
        min: rareFrequencyMin,
        max: rareFrequencyMax,
        step: 0.5,
        value: backgroundStyle(background.id)[key],
        onChange: (value) => updateBackgroundStyle(background.id, { [key]: value }),
      });
      return {
        backgroundId: background.id,
        sync: () => (range.value = String(backgroundStyle(background.id)[key])),
        row: buildRow({ labelText: label, control: range }),
      };
    }),
    ...(background.toggles ?? []).map(({ key, label }) => {
      const toggle = buildToggleSwitch(backgroundStyle(background.id)[key], (checked) =>
        updateBackgroundStyle(background.id, { [key]: checked })
      );
      return {
        backgroundId: background.id,
        sync: () => (toggle.input.checked = backgroundStyle(background.id)[key]),
        row: buildRow({ labelText: label, control: toggle.element }),
      };
    }),
  ]);

  function syncControlRows(backgroundId) {
    const { controls } = findBackground(backgroundId);
    const config = backgroundStyle(backgroundId);
    Object.entries(controlRows).forEach(([key, row]) => {
      const disabled = !controls.includes(key);
      row.classList.toggle("settings-panel__row--disabled", disabled);
      row.querySelector("input").disabled = disabled;
      if (config[key] !== undefined) ranges[key].value = String(config[key]);
    });
    styleRows.forEach(({ backgroundId: owner, sync, row }) => {
      row.hidden = owner !== backgroundId;
      sync();
    });
  }

  const styleSelect = buildSelect({
    options: backgrounds.map(({ id, label }) => ({ value: id, label })),
    value: activeStyleId(),
    onChange: (value) => {
      syncControlRows(value);
      updateAmbient({ backgroundType: value });
    },
  });
  const styleRow = buildRow({ labelText: "Style", control: styleSelect.element });

  const { group } = buildDialogGroup({
    label: "Background style",
    rows: [styleRow, ...Object.values(controlRows), ...styleRows.map(({ row }) => row)],
  });

  function refresh() {
    styleSelect.setValue(activeStyleId());
    syncControlRows(activeStyleId());
  }
  refresh();

  return { element: group, refresh };
}
