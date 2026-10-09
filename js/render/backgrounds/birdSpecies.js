// Silhouettes face left in a 40×16 viewBox with the shoulders at (20, 8); wings beat
// around that point. `size` scales wingspan, `pace` scales crossing time (higher =
// slower), `flapMs` is one wing half-beat, and `glide` birds hold their wings still
// and bank instead. `flock` offsets are [behind, above/below] in wingspans.
export const birdSpecies = [
  {
    id: "songbird",
    weight: 3,
    size: 0.6,
    pace: 0.75,
    flapMs: 140,
    wave: 2.2,
    leftWing: "M20 8 Q14 2 5 5 Q13 6 20 9 Z",
    rightWing: "M20 8 Q26 2 35 5 Q27 6 20 9 Z",
    body: "M14 8.4 Q17 6.8 23 8 Q25 8.6 26 9.4 Q21 9.8 14 8.4 Z",
    flock: [
      [0, 0],
      [1.4, 0.8],
    ],
  },
  {
    id: "gull",
    weight: 2,
    size: 1,
    pace: 1.3,
    glide: true,
    wave: 1.4,
    leftWing: "M20 8 Q15 4 10 5.5 L1 3 Q9 7.5 20 9.4 Z",
    rightWing: "M20 8 Q25 4 30 5.5 L39 3 Q31 7.5 20 9.4 Z",
    body: "M13 8.6 Q17 7.4 24 8.2 L27 9.4 Q20 10 13 8.6 Z",
  },
  {
    id: "geese",
    weight: 1,
    size: 1.1,
    pace: 1.1,
    flapMs: 420,
    wave: 0.6,
    leftWing: "M20 8 Q15 3 6 4 Q14 6.5 20 9.4 Z",
    rightWing: "M20 8 Q25 3 34 4 Q26 6.5 20 9.4 Z",
    body: "M6 7.6 Q9 7 12 8 L24 8.2 Q28 8.6 30 9.6 Q20 10.4 12 9 Q9 8.6 6 7.6 Z",
    flock: [
      [0, 0],
      [0.9, -0.5],
      [0.9, 0.5],
      [1.8, -1],
      [1.8, 1],
      [2.7, -1.5],
      [2.7, 1.5],
    ],
  },
  {
    id: "crows",
    weight: 2,
    size: 0.85,
    pace: 1,
    flapMs: 300,
    wave: 1,
    leftWing: "M20 8 Q15 2.5 7 4 L4 5.5 Q13 6.5 20 9.4 Z",
    rightWing: "M20 8 Q25 2.5 33 4 L36 5.5 Q27 6.5 20 9.4 Z",
    body: "M12 8.4 Q16 7 23 8 L28 8.6 L27 10 Q19 10.2 12 8.4 Z",
    flock: [
      [0, 0],
      [1.5, -1.1],
      [2.7, 0.7],
      [4, -0.4],
    ],
  },
  {
    id: "hawk",
    weight: 1,
    size: 1.3,
    pace: 1.7,
    glide: true,
    wave: 2.6,
    leftWing: "M20 8 Q14 4.5 6 5 L2 6.5 Q11 8 20 9.6 Z",
    rightWing: "M20 8 Q26 4.5 34 5 L38 6.5 Q29 8 20 9.6 Z",
    body: "M14 8.6 Q17 7.2 23 8 L28 8.4 L29 10.2 Q20 10.4 14 8.6 Z",
  },
];

export function pickBird(random = Math.random) {
  const total = birdSpecies.reduce((sum, s) => sum + s.weight, 0);
  let roll = random() * total;
  return birdSpecies.find((s) => (roll -= s.weight) < 0) ?? birdSpecies[0];
}
