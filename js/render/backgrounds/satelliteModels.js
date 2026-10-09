// Silhouettes roughly after real craft, facing left. `size` scales span, `parts` are
// [tone, path] drawn in order (tones style as .stratosphere-scene__part--<tone>), `light`
// is an optional blinking beacon, `steady` craft hold their attitude instead of tumbling,
// and `train` offsets are [behind, below] in spans.
const cells = (xs, y1, y2) => xs.map((x) => `M${x} ${y1} V${y2}`).join(" ");

export const satelliteModels = [
  {
    id: "comsat",
    weight: 3,
    size: 1,
    viewBox: [40, 16],
    parts: [
      ["panel", "M0 5.5 H14 V10.5 H0 Z M26 5.5 H40 V10.5 H26 Z"],
      ["cells", `${cells([3.5, 7, 10.5, 29.5, 33, 36.5], 5.5, 10.5)} M0 8 H14 M26 8 H40`],
      ["strut", "M14 8 H16 M24 8 H26"],
      ["body", "M16 4 H24 V12 H16 Z"],
      ["metal", "M16.5 12 Q20 15.8 23.5 12 Z"],
    ],
    light: [20, 3],
  },
  {
    id: "starlink",
    weight: 2,
    size: 0.8,
    viewBox: [40, 10],
    steady: true,
    parts: [
      ["panel", "M18 2 H39 V8 H18 Z"],
      ["cells", cells([21.5, 25, 28.5, 32, 35.5], 2, 8)],
      ["strut", "M15.5 5 H18"],
      ["metal", "M1 3.8 H15.5 V6.2 H1 Z"],
    ],
    train: [
      [0, 0],
      [1.3, 0.15],
      [2.6, 0.3],
      [3.9, 0.45],
      [5.2, 0.6],
    ],
  },
  {
    id: "cubesat",
    weight: 2,
    size: 0.4,
    viewBox: [16, 16],
    parts: [
      ["panel", "M0 6 H5.4 V10 H0 Z M10.6 6 H16 V10 H10.6 Z"],
      ["strut", "M8 5 V1.5"],
      ["body", "M5.4 5 H10.6 V11 H5.4 Z"],
      ["cells", "M5.4 8 H10.6 M8 5 V11"],
    ],
    train: [
      [0, 0],
      [0.9, 0.6],
    ],
  },
  {
    id: "iridium",
    weight: 2,
    size: 0.9,
    viewBox: [40, 16],
    parts: [
      ["panel", "M29 4.5 H39 V11.5 H29 Z"],
      ["cells", `${cells([32.3, 35.6], 4.5, 11.5)} M29 8 H39`],
      ["strut", "M27 8 H29"],
      ["metal", "M15 3 H26 L27 13 H14 Z"],
      // The door-sized antenna whose mirror finish caused the famous Iridium flares.
      ["flare", "M13.2 4 L9 12.6 L10.8 13 L14.4 4.6 Z"],
    ],
    light: [20.5, 2],
  },
  {
    id: "hubble",
    weight: 1,
    size: 1.1,
    viewBox: [40, 24],
    steady: true,
    parts: [
      ["panel", "M17 1 H22 V8.4 H17 Z M17 15.6 H22 V23 H17 Z"],
      ["cells", "M17 3.5 H22 M17 6 H22 M17 18 H22 M17 20.5 H22"],
      ["strut", "M19.5 8.4 V9 M19.5 15 V15.6"],
      ["metal", "M8 9 H30 V15 H8 Z"],
      ["body", "M30 9 H31.5 V15 H30 Z M5.5 9.6 H8 V14.4 H5.5 Z"],
      ["metal", "M31.5 9 L36 6.2 L36.8 7.2 L32.2 9.8 Z"],
    ],
  },
  {
    id: "sputnik",
    weight: 0.5,
    size: 0.7,
    viewBox: [40, 14],
    parts: [
      ["strut", "M12.5 5.5 L39 1.5 M13 6.5 L39 6 M13 7.5 L38 10.5 M12.5 8.5 L36 13"],
      ["metal", "M7 7 A3.5 3.5 0 1 0 14 7 A3.5 3.5 0 1 0 7 7 Z"],
    ],
  },
];

export function pickSatellite(random = Math.random) {
  const total = satelliteModels.reduce((sum, m) => sum + m.weight, 0);
  let roll = random() * total;
  return satelliteModels.find((m) => (roll -= m.weight) < 0) ?? satelliteModels[0];
}
