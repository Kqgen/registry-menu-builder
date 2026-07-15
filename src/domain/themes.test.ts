import { describe, expect, it } from "vitest";
import { THEMES, getTheme } from "./themes.ts";
import { THEME_IDS } from "./types.ts";

describe("console themes", () => {
  it("defines complete unique two-tone palettes", () => {
    expect(THEMES.map((theme) => theme.id)).toEqual(THEME_IDS);
    expect(new Set(THEMES.map((theme) => `${theme.bannerPrimary}/${theme.bannerSecondary}`)).size).toBe(THEMES.length);
    for (const theme of THEMES) {
      expect(theme.consoleColor).toMatch(/^[0-9A-F]{2}$/u);
      expect(theme.backgroundCss).toMatch(/^#[0-9a-f]{6}$/u);
      expect(theme.foregroundCss).toMatch(/^#[0-9a-f]{6}$/u);
      expect(theme.bannerPrimaryCss).toMatch(/^#[0-9a-f]{6}$/u);
      expect(theme.bannerSecondaryCss).toMatch(/^#[0-9a-f]{6}$/u);
      expect(theme.bannerPrimary).not.toBe(theme.bannerSecondary);
      expect(new Set([theme.bannerPrimary, theme.bannerSecondary])).not.toEqual(new Set(["Cyan", "Yellow"]));
    }
  });

  it("uses a non-yellow violet accent for the water-blue theme", () => {
    const ice = getTheme("ice");
    expect(ice.foregroundCss).toBe("#61d6d6");
    expect(ice.bannerPrimary).toBe("White");
    expect(ice.bannerSecondary).toBe("Magenta");
  });
});
