import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultProject, DEFAULT_PROJECT } from "../domain/defaults.ts";
import { mergeImportedValues } from "../domain/import.ts";
import { parseProjectJson, validateProject } from "../domain/validation.ts";
import { parseRegFile } from "../import/regFile.ts";
import { BUILDER_COPY } from "./builderCopy.ts";
import { resolveAppLocale } from "./locale.ts";

describe("builder localization", () => {
  it("keeps Japanese and English copy complete", () => {
    const japaneseKeys = Object.keys(BUILDER_COPY.ja.text).sort();
    expect(Object.keys(BUILDER_COPY.en.text).sort()).toEqual(japaneseKeys);
    for (const locale of ["ja", "en"] as const) {
      expect(Object.values(BUILDER_COPY[locale].text).every((value) => value.trim().length > 0)).toBe(true);
    }
  });

  it("uses a saved locale before the browser language", () => {
    expect(resolveAppLocale("ja", "en-US")).toBe("ja");
    expect(resolveAppLocale("en", "ja-JP")).toBe("en");
    expect(resolveAppLocale("fr", "ja-JP")).toBe("ja");
    expect(resolveAppLocale(null, "en-US")).toBe("en");
  });

  it("connects every static copy key to the document", () => {
    const html = readFileSync(join(import.meta.dirname, "../../index.html"), "utf8");
    const keys = [...html.matchAll(/data-i18n(?:-aria-label|-content)?="([^"]+)"/gu)]
      .map((match) => match[1])
      .filter((key): key is string => key !== undefined);
    expect(new Set(keys)).toEqual(new Set(Object.keys(BUILDER_COPY.ja.text)));
  });

  it("localizes validation and JSON parsing errors", () => {
    const invalid = { ...DEFAULT_PROJECT, title: "" };
    expect(validateProject(invalid, "ja").map((issue) => issue.message)).toContain("ツール名は必須です");
    expect(validateProject(invalid, "en").map((issue) => issue.message)).toContain("Tool name is required");
    expect(parseProjectJson("{", "ja")).toEqual({ ok: false, errors: ["JSONの構文が不正です"] });
    expect(parseProjectJson("{", "en")).toEqual({ ok: false, errors: ["The JSON syntax is invalid"] });
  });

  it("localizes REG errors and newly imported project content", () => {
    const invalid = new TextEncoder().encode("not a registry file");
    expect(() => parseRegFile(invalid, "bad.reg", "ja")).toThrow(".regヘッダーが見つかりません");
    expect(() => parseRegFile(invalid, "bad.reg", "en")).toThrow("no .reg header was found");

    const valid = new TextEncoder().encode([
      "Windows Registry Editor Version 5.00",
      "[HKEY_CURRENT_USER\\Software\\LocaleTest]",
      "@=\"value\"",
    ].join("\r\n"));
    const parsed = parseRegFile(valid, "locale.reg", "en");
    const merged = mergeImportedValues({ ...DEFAULT_PROJECT, tweaks: [] }, parsed.values, "en");
    expect(merged.tweaks[0]?.label).toBe("(Default)");
    expect(merged.tweaks[0]?.description).toBe("Imported from locale.reg");
  });

  it("localizes only newly created sample content", () => {
    expect(createDefaultProject("ja").tweaks[0]?.label).toBe("ファイル拡張子を表示");
    expect(createDefaultProject("en").tweaks[0]?.label).toBe("Show file extensions");
    expect(JSON.stringify(DEFAULT_PROJECT)).not.toContain("locale");
  });
});
