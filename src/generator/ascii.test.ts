import { describe, expect, it } from "vitest";
import { BANNER_STYLE_IDS } from "../domain/types.ts";
import { renderAsciiBanner, renderStyledAsciiBanner } from "./ascii.ts";

describe("renderAsciiBanner", () => {
  it("renders five deterministic and visibly distinct logo styles", () => {
    const outputs = BANNER_STYLE_IDS.map((style) => renderAsciiBanner("GAME TWEAK", style));
    expect(outputs.map((rows) => rows.length)).toEqual([7, 6, 9, 7, 6]);
    expect(new Set(outputs.map((rows) => rows.join("\n"))).size).toBe(BANNER_STYLE_IDS.length);
    expect(outputs[0]?.join("\n")).toMatch(/[▀▄█]/u);
    expect(outputs[0]?.join("\n")).toContain("╺");
    expect(outputs[1]?.join("\n")).toMatch(/[▀▄█]/u);
    expect(outputs[1]?.join("\n")).toContain("╱╱");
    expect(renderStyledAsciiBanner("GAME TWEAK", "drift").flat().some((segment) => segment.tone === "secondary")).toBe(true);
    expect(outputs[2]?.join("\n")).toMatch(/[━┃╱╲+]/u);
    expect(renderStyledAsciiBanner("GAME TWEAK", "ghost").flat().some((segment) => segment.tone === "secondary")).toBe(true);
    expect(outputs[3]?.join("\n")).toContain("▒");
    expect(renderStyledAsciiBanner("GAME TWEAK", "umbra").flat().some((segment) => segment.tone === "secondary")).toBe(true);
    expect(outputs[4]?.join("\n")).toMatch(/[▓▒░]/u);
    expect(renderStyledAsciiBanner("GAME TWEAK", "ember").flat().some((segment) => segment.tone === "secondary")).toBe(true);
    expect(renderAsciiBanner("GAME TWEAK", "drift")).toEqual(outputs[1]);
  });

  it("keeps supported banner lengths inside the fixed dashboard width without a size cliff", () => {
    const widths = ["ABCDEFGHIJ", "ABCDEFGHIJK", "ABCDEFGHIJKLMN"].map((text) =>
      Math.max(...BANNER_STYLE_IDS.flatMap((style) => renderAsciiBanner(text, style).map((row) => row.length))),
    );
    expect(widths.every((width) => width <= 118)).toBe(true);
    expect(Math.abs((widths[1] ?? 0) - (widths[0] ?? 0))).toBeLessThan(10);
    expect(widths[2]).toBeGreaterThan(widths[1] ?? 0);
  });

  it("rejects characters instead of substituting an unknown glyph", () => {
    expect(() => renderAsciiBanner("GAME!", "apex")).toThrow("Unsupported banner character");
  });

  it("uses single-cell ASCII nodes for the ghost style", () => {
    const output = renderAsciiBanner("MAX PENDING", "ghost").join("\n");
    expect(output).toContain("+");
    expect(output).not.toContain("◆");
  });
});
