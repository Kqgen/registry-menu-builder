import { describe, expect, it } from "vitest";
import { DEFAULT_PROJECT, DEFAULT_TWEAK } from "./defaults.ts";
import type { RegistryProject, RegistryTweak } from "./types.ts";
import { parseProjectJson, parseRegistryData, validateProject, validateTweak } from "./validation.ts";

function tweak(overrides: Partial<RegistryTweak>): RegistryTweak {
  return { ...DEFAULT_TWEAK, ...overrides };
}

describe("parseRegistryData", () => {
  it("parses every supported data family without Number precision loss", () => {
    expect(parseRegistryData("REG_DWORD", "0xffffffff")).toEqual({
      kind: "integer",
      value: 4_294_967_295n,
    });
    expect(parseRegistryData("REG_QWORD", "18446744073709551615")).toEqual({
      kind: "integer",
      value: 18_446_744_073_709_551_615n,
    });
    expect(parseRegistryData("REG_BINARY", "01, ff a0")).toEqual({
      kind: "binary",
      value: [1, 255, 160],
    });
    expect(parseRegistryData("REG_MULTI_SZ", "alpha\n日本語")).toEqual({
      kind: "multi",
      value: ["alpha", "日本語"],
    });
  });

  it.each([
    ["REG_DWORD", "-1"],
    ["REG_DWORD", "4294967296"],
    ["REG_QWORD", "1e3"],
    ["REG_BINARY", "0 fff zz"],
  ] as const)("rejects invalid %s input", (type, data) => {
    expect(() => parseRegistryData(type, data)).toThrow();
  });
});

describe("validateTweak", () => {
  it("rejects provider, hive, remote and empty path segments", () => {
    const paths = ["Registry::HKEY_CURRENT_USER\\Software", "HKCU:\\Software", "\\\\host\\HKCU", "Software\\\\Bad"];
    paths.forEach((keyPath) => {
      expect(validateTweak(tweak({ keyPath })).some((issue) => issue.path.endsWith("keyPath"))).toBe(true);
    });
  });

  it("rejects control characters while preserving multiline multi-string data", () => {
    expect(validateTweak(tweak({ valueType: "REG_SZ", data: "a\nb" }))).not.toHaveLength(0);
    expect(validateTweak(tweak({ valueType: "REG_MULTI_SZ", data: "a\nb" }))).toHaveLength(0);
    expect(validateTweak(tweak({ label: "ok\tbad" }))).not.toHaveLength(0);
  });

  it("accepts an empty value name for the registry default value", () => {
    expect(validateTweak(tweak({ valueName: "" }))).toEqual([]);
  });
});

describe("validateProject", () => {
  it("accepts the default project", () => {
    expect(validateProject(DEFAULT_PROJECT)).toEqual([]);
  });

  it("rejects duplicate IDs and case-insensitive targets", () => {
    const project: RegistryProject = {
      ...DEFAULT_PROJECT,
      tweaks: [
        DEFAULT_TWEAK,
        tweak({ label: "Duplicate", keyPath: DEFAULT_TWEAK.keyPath.toUpperCase() }),
      ],
    };
    const messages = validateProject(project).map((issue) => issue.message);
    expect(messages).toContain("内部IDが重複しています");
    expect(messages).toContain("同じレジストリ値が重複しています");
  });

  it("enforces the item limit and safe banner alphabet", () => {
    const many = Array.from({ length: 41 }, (_, index) =>
      tweak({ id: `item_${index}`, valueName: `Value${index}` }),
    );
    const project = { ...DEFAULT_PROJECT, bannerText: "日本語", tweaks: many };
    expect(validateProject(project).map((issue) => issue.path)).toEqual(
      expect.arrayContaining(["bannerText", "tweaks"]),
    );
  });
});

describe("parseProjectJson", () => {
  it("round-trips a valid project", () => {
    expect(parseProjectJson(JSON.stringify(DEFAULT_PROJECT))).toEqual({
      ok: true,
      project: DEFAULT_PROJECT,
    });
  });

  it("rejects unknown fields without mutating a model", () => {
    const json = JSON.stringify(DEFAULT_PROJECT).replace(
      '"version":1',
      '"version":1,"__proto__":{"polluted":true}',
    );
    const result = parseProjectJson(json);
    expect(result.ok).toBe(false);
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });

  it("rejects oversized JSON before parsing", () => {
    expect(parseProjectJson(" ".repeat(262_145))).toEqual({
      ok: false,
      errors: ["JSONは256KB以下にしてください"],
    });
  });

  it("migrates a schema v1 project without a banner style", () => {
    const legacy = JSON.parse(JSON.stringify(DEFAULT_PROJECT)) as Record<string, unknown>;
    delete legacy["bannerStyle"];
    const result = parseProjectJson(JSON.stringify(legacy));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.bannerStyle).toBe("drift");
    }
  });
});
