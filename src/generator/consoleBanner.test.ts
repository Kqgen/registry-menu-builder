import { describe, expect, it } from "vitest";
import { renderStyledAsciiBanner } from "./ascii.ts";
import { buildConsoleBannerPayload } from "./consoleBanner.ts";

function decodeUtf8Base64(value: string): string {
  const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

describe("console banner payload", () => {
  it("uses one canvas origin for every row instead of centering glyph rows independently", () => {
    const payload = decodeUtf8Base64(buildConsoleBannerPayload(renderStyledAsciiBanner("GAME TWEAK", "apex"), 118));
    const outerPadding = payload.split("\u001e").map((row) => {
      const first = row.split("\u001f")[0] ?? "";
      expect(first.startsWith("0")).toBe(true);
      return first.slice(1).length;
    });
    expect(new Set(outerPadding).size).toBe(1);
  });
});
