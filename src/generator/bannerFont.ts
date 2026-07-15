export const VECTOR_HORIZONTAL = 1;
export const VECTOR_VERTICAL = 2;
export const VECTOR_DIAGONAL_DOWN = 4;
export const VECTOR_DIAGONAL_UP = 8;

export type VectorCanvas = readonly (readonly number[])[];

type StrokeId = keyof typeof STROKES;

interface Stroke {
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
}

const STROKES = {
  top: { from: [0, 0], to: [6, 0] },
  upperLeft: { from: [0, 0], to: [0, 4] },
  upperRight: { from: [6, 0], to: [6, 4] },
  middleLeft: { from: [0, 4], to: [3, 4] },
  middleRight: { from: [3, 4], to: [6, 4] },
  lowerLeft: { from: [0, 4], to: [0, 8] },
  lowerRight: { from: [6, 4], to: [6, 8] },
  bottom: { from: [0, 8], to: [6, 8] },
  centerUpper: { from: [3, 0], to: [3, 4] },
  centerLower: { from: [3, 4], to: [3, 8] },
  upperLeftDiagonal: { from: [0, 0], to: [3, 4] },
  upperRightDiagonal: { from: [6, 0], to: [3, 4] },
  lowerLeftDiagonal: { from: [3, 4], to: [0, 8] },
  lowerRightDiagonal: { from: [3, 4], to: [6, 8] },
  fullDownDiagonal: { from: [0, 0], to: [6, 8] },
  fullUpDiagonal: { from: [6, 0], to: [0, 8] },
  leftToBottomCenter: { from: [0, 0], to: [3, 8] },
  rightToBottomCenter: { from: [6, 0], to: [3, 8] },
} as const satisfies Readonly<Record<string, Stroke>>;

const MIDDLE = ["middleLeft", "middleRight"] as const;
const OUTER = ["top", "upperRight", "lowerRight", "bottom", "lowerLeft", "upperLeft"] as const;

const GLYPH_STROKES: Readonly<Record<string, readonly StrokeId[]>> = {
  " ": [],
  "-": MIDDLE,
  "0": OUTER,
  "1": ["upperRight", "lowerRight"],
  "2": ["top", "upperRight", ...MIDDLE, "lowerLeft", "bottom"],
  "3": ["top", "upperRight", ...MIDDLE, "lowerRight", "bottom"],
  "4": ["upperLeft", ...MIDDLE, "upperRight", "lowerRight"],
  "5": ["top", "upperLeft", ...MIDDLE, "lowerRight", "bottom"],
  "6": ["top", "upperLeft", ...MIDDLE, "lowerLeft", "lowerRight", "bottom"],
  "7": ["top", "upperRight", "lowerRight"],
  "8": [...OUTER, ...MIDDLE],
  "9": ["top", "upperLeft", "upperRight", ...MIDDLE, "lowerRight", "bottom"],
  A: ["top", "upperLeft", "upperRight", ...MIDDLE, "lowerLeft", "lowerRight"],
  B: [...OUTER, ...MIDDLE],
  C: ["top", "upperLeft", "lowerLeft", "bottom"],
  D: OUTER,
  E: ["top", "upperLeft", ...MIDDLE, "lowerLeft", "bottom"],
  F: ["top", "upperLeft", ...MIDDLE, "lowerLeft"],
  G: ["top", "upperLeft", "lowerLeft", "bottom", "lowerRight", "middleRight"],
  H: ["upperLeft", "lowerLeft", ...MIDDLE, "upperRight", "lowerRight"],
  I: ["top", "centerUpper", "centerLower", "bottom"],
  J: ["upperRight", "lowerRight", "bottom", "lowerLeft"],
  K: ["upperLeft", "lowerLeft", "middleLeft", "upperRightDiagonal", "lowerRightDiagonal"],
  L: ["upperLeft", "lowerLeft", "bottom"],
  M: ["upperLeft", "lowerLeft", "upperRight", "lowerRight", "upperLeftDiagonal", "upperRightDiagonal"],
  N: ["upperLeft", "lowerLeft", "upperRight", "lowerRight", "fullDownDiagonal"],
  O: OUTER,
  P: ["top", "upperLeft", "lowerLeft", "upperRight", ...MIDDLE],
  Q: [...OUTER, "lowerRightDiagonal"],
  R: ["top", "upperLeft", "lowerLeft", "upperRight", ...MIDDLE, "lowerRightDiagonal"],
  S: ["top", "upperLeft", ...MIDDLE, "lowerRight", "bottom"],
  T: ["top", "centerUpper", "centerLower"],
  U: ["upperLeft", "lowerLeft", "upperRight", "lowerRight", "bottom"],
  V: ["leftToBottomCenter", "rightToBottomCenter"],
  W: ["upperLeft", "lowerLeft", "upperRight", "lowerRight", "lowerLeftDiagonal", "lowerRightDiagonal"],
  X: ["fullDownDiagonal", "fullUpDiagonal"],
  Y: ["upperLeftDiagonal", "upperRightDiagonal", "centerLower"],
  Z: ["top", "fullUpDiagonal", "bottom"],
};

function orientation(stroke: Stroke): number {
  const [fromX, fromY] = stroke.from;
  const [toX, toY] = stroke.to;
  if (fromY === toY) {
    return VECTOR_HORIZONTAL;
  }
  if (fromX === toX) {
    return VECTOR_VERTICAL;
  }
  return (toX - fromX) * (toY - fromY) > 0 ? VECTOR_DIAGONAL_DOWN : VECTOR_DIAGONAL_UP;
}

function drawStroke(canvas: number[][], stroke: Stroke, offsetX: number): void {
  let [x, y] = stroke.from;
  const [targetX, targetY] = stroke.to;
  const deltaX = Math.abs(targetX - x);
  const stepX = x < targetX ? 1 : -1;
  const deltaY = -Math.abs(targetY - y);
  const stepY = y < targetY ? 1 : -1;
  let error = deltaX + deltaY;
  const mask = orientation(stroke);
  while (true) {
    const row = canvas[y];
    if (row === undefined) {
      throw new Error("Banner stroke exceeded the canvas.");
    }
    row[x + offsetX] = (row[x + offsetX] ?? 0) | mask;
    if (x === targetX && y === targetY) {
      break;
    }
    const doubled = error * 2;
    if (doubled >= deltaY) {
      error += deltaY;
      x += stepX;
    }
    if (doubled <= deltaX) {
      error += deltaX;
      y += stepY;
    }
  }
}

const GLYPH_WIDTH = 7;

export function glyphSpacing(characterCount: number): number {
  return characterCount <= 10 ? 2 : 1;
}

export function composeVectorBanner(text: string): VectorCanvas {
  const characters = [...text.toUpperCase()];
  const spacing = glyphSpacing(characters.length);
  const width = characters.length * GLYPH_WIDTH + Math.max(0, characters.length - 1) * spacing;
  const canvas = Array.from({ length: 9 }, () => Array.from({ length: width }, () => 0));
  characters.forEach((character, index) => {
    const strokes = GLYPH_STROKES[character];
    if (strokes === undefined) {
      throw new Error(`Unsupported banner character: ${character}`);
    }
    const offsetX = index * (7 + spacing);
    strokes.forEach((strokeId) => drawStroke(canvas, STROKES[strokeId], offsetX));
  });
  return canvas;
}
