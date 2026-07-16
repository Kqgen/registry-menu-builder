import { describe, expect, it } from "vitest";
import { consoleDisplayWidth, panelLine, sectionRule } from "./consoleLayout.ts";

describe("console layout", () => {
  it("keeps framed Japanese and English rows at the requested display width", () => {
    for (const value of ["日本語の表示", "English display", "日本語 / English"]) {
      expect(consoleDisplayWidth(panelLine(value, 40))).toBe(40);
      expect(consoleDisplayWidth(sectionRule(value, 40))).toBe(40);
    }
  });

  it("truncates wide content without moving the right border", () => {
    const line = panelLine("日本語".repeat(40), 30);
    expect(consoleDisplayWidth(line)).toBe(30);
    expect(line.endsWith(" |"), line).toBe(true);
    expect(line).toContain("...");
  });
});
