import type { BannerStyleId } from "../domain/types.ts";
import {
  VECTOR_DIAGONAL_DOWN,
  VECTOR_DIAGONAL_UP,
  VECTOR_HORIZONTAL,
  VECTOR_VERTICAL,
  composeVectorBanner,
  glyphSpacing,
  type VectorCanvas,
} from "./bannerFont.ts";

export type BannerTone = "plain" | "primary" | "secondary";

export interface BannerSegment {
  readonly tone: BannerTone;
  readonly text: string;
}

export type StyledBanner = readonly (readonly BannerSegment[])[];

interface PaintedCell {
  readonly tone: Exclude<BannerTone, "plain">;
  readonly text: string;
}

const UPSCALED_ROWS = [0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 8] as const;

function trimCells(row: readonly (PaintedCell | undefined)[]): readonly (PaintedCell | undefined)[] {
  let end = row.length;
  while (end > 0 && row[end - 1] === undefined) {
    end -= 1;
  }
  return row.slice(0, end);
}

function groupPaintedCells(row: readonly (PaintedCell | undefined)[]): readonly BannerSegment[] {
  const segments: BannerSegment[] = [];
  for (const cell of trimCells(row)) {
    const tone: BannerTone = cell?.tone ?? "plain";
    const text = cell?.text ?? " ";
    const last = segments[segments.length - 1];
    if (last?.tone === tone) {
      segments[segments.length - 1] = { tone, text: `${last.text}${text}` };
    } else {
      segments.push({ tone, text });
    }
  }
  return segments;
}

function booleanCanvas(canvas: VectorCanvas): readonly (readonly boolean[])[] {
  return canvas.map((row) => row.map((cell) => cell !== 0));
}

function dilateHorizontal(matrix: readonly (readonly boolean[])[]): readonly (readonly boolean[])[] {
  const width = (matrix[0]?.length ?? 0) + 1;
  return matrix.map((row) => {
    const expanded = Array.from({ length: width }, () => false);
    row.forEach((cell, column) => {
      if (cell) {
        expanded[column] = true;
        expanded[column + 1] = true;
      }
    });
    return expanded;
  });
}

function shearForward(matrix: readonly (readonly boolean[])[]): readonly (readonly boolean[])[] {
  const width = (matrix[0]?.length ?? 0) + 4;
  return matrix.map((row, rowIndex) => {
    const shift = Math.floor((matrix.length - rowIndex - 1) / 2);
    const shifted = Array.from({ length: width }, () => false);
    row.forEach((cell, column) => {
      if (cell) {
        shifted[column + shift] = true;
      }
    });
    return shifted;
  });
}

function upscaleRows(matrix: readonly (readonly boolean[])[]): readonly (readonly boolean[])[] {
  return UPSCALED_ROWS.map((sourceRow) => matrix[sourceRow] ?? []);
}

function packedCharacter(top: boolean, bottom: boolean): string | undefined {
  if (top && bottom) {
    return "█";
  }
  if (top) {
    return "▀";
  }
  return bottom ? "▄" : undefined;
}

function packHalfBlocks(
  matrix: readonly (readonly boolean[])[],
  tone: (row: number) => Exclude<BannerTone, "plain">,
): readonly (readonly (PaintedCell | undefined)[])[] {
  const width = matrix[0]?.length ?? 0;
  return Array.from({ length: Math.ceil(matrix.length / 2) }, (_, packedRow) =>
    Array.from({ length: width }, (_, column) => {
      const text = packedCharacter(
        matrix[packedRow * 2]?.[column] === true,
        matrix[packedRow * 2 + 1]?.[column] === true,
      );
      return text === undefined ? undefined : { tone: tone(packedRow), text };
    }),
  );
}

function rail(width: number): readonly BannerSegment[] {
  const leftEnd = Math.max(12, Math.floor(width * 0.42));
  const rightStart = Math.max(leftEnd + 4, width - 12);
  const cells = Array.from({ length: width }, () => undefined as PaintedCell | undefined);
  for (let column = 0; column < leftEnd; column += 1) {
    cells[column] = { tone: "secondary", text: column === 0 ? "╺" : column === leftEnd - 1 ? "╸" : "━" };
  }
  for (let column = rightStart; column < width; column += 1) {
    cells[column] = { tone: "secondary", text: column === rightStart ? "╺" : column === width - 1 ? "╸" : "━" };
  }
  return groupPaintedCells(cells);
}

function widen(matrix: readonly (readonly boolean[])[], wide: boolean): readonly (readonly boolean[])[] {
  return wide ? dilateHorizontal(matrix) : matrix;
}

function renderApex(canvas: VectorCanvas, wide: boolean): StyledBanner {
  const body = packHalfBlocks(upscaleRows(widen(booleanCanvas(canvas), wide)), () => "primary")
    .map(groupPaintedCells);
  const width = body.reduce((maximum, row) => Math.max(maximum, row.reduce((sum, segment) => sum + segment.text.length, 0)), 0);
  return [...body, rail(width)];
}

function renderDrift(canvas: VectorCanvas, wide: boolean): StyledBanner {
  const packed = packHalfBlocks(
    upscaleRows(widen(shearForward(booleanCanvas(canvas)), wide)),
    () => "primary",
  );
  const decorated = (packed[0]?.length ?? 0) + 8 <= 118;
  return packed.map((row, rowIndex) => {
    const left = decorated && rowIndex === 3
      ? [{ tone: "secondary", text: "╱╱ " } satisfies BannerSegment]
      : decorated ? [{ tone: "plain", text: "   " } satisfies BannerSegment] : [];
    const right = decorated && rowIndex === 3 ? [{ tone: "secondary", text: " ╱╱╱" } satisfies BannerSegment] : [];
    return [...left, ...groupPaintedCells(row), ...right];
  });
}

function bitCount(value: number): number {
  let count = 0;
  for (let remaining = value; remaining !== 0; remaining >>>= 1) {
    count += remaining & 1;
  }
  return count;
}

function neighborCount(canvas: VectorCanvas, row: number, column: number): number {
  let count = 0;
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if ((rowOffset !== 0 || columnOffset !== 0) && (canvas[row + rowOffset]?.[column + columnOffset] ?? 0) !== 0) {
        count += 1;
      }
    }
  }
  return count;
}

function vectorCharacter(mask: number): string {
  if ((mask & VECTOR_HORIZONTAL) !== 0) {
    return "━";
  }
  if ((mask & VECTOR_VERTICAL) !== 0) {
    return "┃";
  }
  if ((mask & VECTOR_DIAGONAL_DOWN) !== 0) {
    return "╲";
  }
  return (mask & VECTOR_DIAGONAL_UP) !== 0 ? "╱" : "◆";
}

const JUNCTION_UP = 1;
const JUNCTION_DOWN = 2;
const JUNCTION_LEFT = 4;
const JUNCTION_RIGHT = 8;

const JUNCTION_CHARACTERS: Readonly<Record<number, string>> = {
  [JUNCTION_DOWN | JUNCTION_RIGHT]: "┏",
  [JUNCTION_DOWN | JUNCTION_LEFT]: "┓",
  [JUNCTION_UP | JUNCTION_RIGHT]: "┗",
  [JUNCTION_UP | JUNCTION_LEFT]: "┛",
  [JUNCTION_LEFT | JUNCTION_RIGHT | JUNCTION_DOWN]: "┳",
  [JUNCTION_LEFT | JUNCTION_RIGHT | JUNCTION_UP]: "┻",
  [JUNCTION_UP | JUNCTION_DOWN | JUNCTION_RIGHT]: "┣",
  [JUNCTION_UP | JUNCTION_DOWN | JUNCTION_LEFT]: "┫",
  [JUNCTION_UP | JUNCTION_DOWN | JUNCTION_LEFT | JUNCTION_RIGHT]: "╋",
};

function junctionCharacter(canvas: VectorCanvas, row: number, column: number): string | undefined {
  const connections = (((canvas[row - 1]?.[column] ?? 0) & VECTOR_VERTICAL) !== 0 ? JUNCTION_UP : 0)
    | (((canvas[row + 1]?.[column] ?? 0) & VECTOR_VERTICAL) !== 0 ? JUNCTION_DOWN : 0)
    | (((canvas[row]?.[column - 1] ?? 0) & VECTOR_HORIZONTAL) !== 0 ? JUNCTION_LEFT : 0)
    | (((canvas[row]?.[column + 1] ?? 0) & VECTOR_HORIZONTAL) !== 0 ? JUNCTION_RIGHT : 0);
  return JUNCTION_CHARACTERS[connections];
}

function renderGhost(canvas: VectorCanvas): StyledBanner {
  return canvas.map((row, rowIndex) => groupPaintedCells(row.map((mask, column) => {
    if (mask === 0) {
      return undefined;
    }
    const diagonal = (mask & (VECTOR_DIAGONAL_DOWN | VECTOR_DIAGONAL_UP)) !== 0;
    if (bitCount(mask) > 1) {
      const corner = diagonal ? undefined : junctionCharacter(canvas, rowIndex, column);
      return corner === undefined
        ? { tone: "secondary" as const, text: "◆" }
        : { tone: "primary" as const, text: corner };
    }
    if (neighborCount(canvas, rowIndex, column) <= 1) {
      return { tone: "secondary" as const, text: "◆" };
    }
    return { tone: "primary" as const, text: vectorCharacter(mask) };
  })));
}

function renderUmbra(canvas: VectorCanvas, wide: boolean): StyledBanner {
  const body = packHalfBlocks(upscaleRows(widen(booleanCanvas(canvas), wide)), () => "primary");
  const width = (body[0]?.length ?? 0) + 1;
  return Array.from({ length: body.length + 1 }, (_, rowIndex) =>
    groupPaintedCells(Array.from({ length: width }, (_, column) => {
      const cell = body[rowIndex]?.[column];
      if (cell !== undefined) {
        return cell;
      }
      return body[rowIndex - 1]?.[column - 1] === undefined
        ? undefined
        : { tone: "secondary" as const, text: "▒" };
    })),
  );
}

const EMBER_FILLS = [
  ["█"], ["█"], ["▓"],
  ["▓", "▓", "▒", "▓"],
  ["▒", "░", "▒", "▒"],
  ["░", "", "░", "░"],
] as const;

function renderEmber(canvas: VectorCanvas, wide: boolean): StyledBanner {
  const body = packHalfBlocks(upscaleRows(widen(booleanCanvas(canvas), wide)), () => "primary");
  return body.map((row, rowIndex) => groupPaintedCells(row.map((cell, column) => {
    if (cell === undefined) {
      return undefined;
    }
    const fills = EMBER_FILLS[rowIndex] ?? ["░"];
    const pick = fills[(rowIndex * 31 + column * 17) % fills.length] ?? "░";
    if (pick === "") {
      return undefined;
    }
    return {
      tone: rowIndex <= 2 ? "primary" as const : "secondary" as const,
      text: cell.text === "█" ? pick : cell.text,
    };
  })));
}

const RENDERERS: Readonly<Record<BannerStyleId, (canvas: VectorCanvas, wide: boolean) => StyledBanner>> = {
  apex: renderApex,
  drift: renderDrift,
  ghost: renderGhost,
  umbra: renderUmbra,
  ember: renderEmber,
};

export function renderStyledAsciiBanner(text: string, style: BannerStyleId): StyledBanner {
  return RENDERERS[style](composeVectorBanner(text), glyphSpacing([...text].length) > 1);
}

export function renderAsciiBanner(text: string, style: BannerStyleId): readonly string[] {
  return renderStyledAsciiBanner(text, style).map((row) => row.map((segment) => segment.text).join(""));
}
