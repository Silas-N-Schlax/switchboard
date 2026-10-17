// Silhouettes face left (head at x≈0). `tailOrigin`/`fins[].origin` are the joints the
// tail beats and fins sway around, in viewBox units. `size` scales body length,
// `pace` scales crossing time (higher = slower), `wagMs` is one tail half-beat.
// `eye` is [cx, cy, r]; `details` adds extra markings (tone: dark | line).
// `swimEasing` shapes each of the three surges per crossing; small fish swim steadily.
export const fishSpecies = [
  {
    id: "classic",
    weight: 3,
    viewBox: [100, 50],
    size: 1,
    pace: 1,
    wagMs: 650,
    swimEasing: "cubic-bezier(0.3, 0.15, 0.7, 0.85)",
    body: "M4 25 C14 9 50 6 70 21 L73 25 L70 29 C50 44 14 41 4 25 Z",
    tail: { d: "M66 25 L96 9 Q89 25 96 41 Z", origin: [68, 25] },
    fins: [{ d: "M30 13 Q42 1 56 14 Z", origin: [43, 13] }],
    eye: [15, 22, 2.4],
  },
  {
    id: "minnow",
    weight: 2,
    viewBox: [100, 30],
    size: 0.55,
    pace: 0.65,
    wagMs: 380,
    swimEasing: "linear",
    body: "M2 15 C14 6 50 5 76 13 L79 15 L76 17 C50 25 14 24 2 15 Z",
    tail: { d: "M74 15 L97 5 Q91 15 97 25 Z", origin: [76, 15] },
    fins: [{ d: "M40 8 L50 2 L55 9 Z", origin: [47, 8] }],
    eye: [10, 13.5, 1.7],
    school: [
      [0, 0],
      [0.9, -0.9],
      [1.4, 0.8],
      [2.4, -0.2],
      [3.1, 1.3],
    ],
  },
  {
    id: "tetra",
    weight: 2,
    viewBox: [100, 60],
    size: 0.7,
    pace: 0.8,
    wagMs: 320,
    swimEasing: "linear",
    body: "M4 30 C8 10 40 4 62 18 C70 23 72 27 72 30 C72 33 70 37 62 42 C40 56 8 50 4 30 Z",
    tail: { d: "M66 30 L94 14 Q86 30 94 46 Z", origin: [68, 30] },
    fins: [
      { d: "M32 10 Q42 -1 54 11 Z", origin: [43, 10] },
      { d: "M36 49 Q42 58 50 52 Z", origin: [42, 49] },
    ],
    eye: [16, 26, 2.8],
  },
  {
    id: "angelfish",
    weight: 1,
    viewBox: [80, 100],
    size: 0.75,
    pace: 1.4,
    wagMs: 900,
    swimEasing: "cubic-bezier(0.35, 0.2, 0.65, 0.8)",
    body: "M4 50 C10 38 26 28 44 30 C52 34 58 42 60 50 C58 58 52 66 44 70 C26 72 10 62 4 50 Z",
    tail: { d: "M54 50 L77 37 Q72 50 77 63 Z", origin: [56, 50] },
    fins: [
      { d: "M18 35 C30 18 48 6 66 2 C60 14 56 26 54 40 Z", origin: [36, 32] },
      { d: "M18 65 C30 82 48 94 66 98 C60 86 56 74 54 60 Z", origin: [36, 68] },
    ],
    eye: [14, 46, 2.4],
  },
  {
    id: "koi",
    weight: 1,
    viewBox: [140, 50],
    size: 1.5,
    pace: 1.3,
    wagMs: 1000,
    swimEasing: "cubic-bezier(0.35, 0.2, 0.65, 0.8)",
    body: "M3 25 C12 10 50 8 90 18 C100 21 104 23 106 25 C104 27 100 29 90 32 C50 42 12 40 3 25 Z",
    tail: {
      d: "M98 25 C112 14 126 6 138 4 C130 16 130 34 138 46 C126 44 112 36 98 25 Z",
      origin: [100, 25],
      flowing: true,
    },
    fins: [
      { d: "M30 33 Q34 47 46 46 Q42 38 38 32 Z", origin: [34, 33] },
      { d: "M48 13 Q60 3 72 15 Z", origin: [58, 13] },
    ],
    eye: [12, 22, 2.2],
  },
  {
    id: "shark",
    weight: 0.05,
    viewBox: [160, 60],
    size: 2.4,
    pace: 1.1,
    wagMs: 1100,
    swimEasing: "linear",
    body: "M2 30 C10 23 30 18 60 18 C90 18 112 24 124 30 L126 32 L124 34 C112 38 90 42 60 42 C30 42 10 37 2 30 Z",
    tail: {
      d: "M120 32 C130 24 140 12 156 2 C150 14 146 24 144 32 C146 38 150 44 154 52 C142 46 130 40 120 32 Z",
      origin: [122, 32],
    },
    fins: [
      { d: "M52 19 L74 0 Q75 10 84 19 Z", origin: [68, 19] },
      { d: "M42 40 Q48 54 62 58 Q58 48 56 41 Z", origin: [50, 41] },
    ],
    eye: null,
    details: [
      { tone: "dark", d: "M12.5 27 L21 24.6 Q20.2 28.4 16.4 28.8 Q13.2 28.8 12.5 27 Z" },
      { tone: "line", d: "M36 24.5 Q34 29.5 36 34.5 M40 24 Q38 29.5 40 35 M44 24 Q42 29.5 44 35" },
    ],
  },
];

// `sharkFrequency` scales the shark's weight, so 1 keeps it as rare as listed.
export function pickSpecies(sharkFrequency = 1, random = Math.random) {
  const weightOf = (s) => (s.id === "shark" ? s.weight * sharkFrequency : s.weight);
  const total = fishSpecies.reduce((sum, s) => sum + weightOf(s), 0);
  let roll = random() * total;
  return fishSpecies.find((s) => (roll -= weightOf(s)) < 0) ?? fishSpecies[0];
}
