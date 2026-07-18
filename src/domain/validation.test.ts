import { describe, expect, it } from "vitest";
import { createEmptyPowerPlanAction, DEFAULT_PROJECT, DEFAULT_TWEAK } from "./defaults.ts";
import { MAX_PROJECT_JSON_BYTES, MAX_TWEAKS, type PowerPlanAction, type RegistryProject, type RegistryTweak } from "./types.ts";
import { parseProjectJson, parseRegistryData, validateProject, validateSystemAction, validateTweak } from "./validation.ts";

function tweak(overrides: Partial<RegistryTweak>): RegistryTweak {
  return { ...DEFAULT_TWEAK, ...overrides };
}

function powerAction(overrides: Partial<PowerPlanAction> = {}): PowerPlanAction {
  return { ...createEmptyPowerPlanAction("en"), id: "power_plan_action", ...overrides };
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
    const many = Array.from({ length: MAX_TWEAKS + 1 }, (_, index) =>
      tweak({ id: `item_${index}`, valueName: `Value${index}` }),
    );
    const project = { ...DEFAULT_PROJECT, bannerText: "日本語", tweaks: many };
    expect(validateProject(project).map((issue) => issue.path)).toEqual(
      expect.arrayContaining(["bannerText", "tweaks"]),
    );
  });

  it("accepts a power-plan-only project and rejects unsafe or conflicting actions", () => {
    expect(validateProject({ ...DEFAULT_PROJECT, tweaks: [], actions: [powerAction()] })).toEqual([]);
    expect(validateSystemAction(powerAction({ schemeGuid: "-setactive calc.exe" }))).not.toHaveLength(0);
    const duplicate = powerAction({ id: DEFAULT_TWEAK.id });
    const second = powerAction({ id: "second_power_action" });
    const paths = validateProject({ ...DEFAULT_PROJECT, actions: [duplicate, second] }).map((issue) => issue.path);
    expect(paths).toEqual(expect.arrayContaining(["actions.0.id", "actions"]));
  });
});

describe("parseProjectJson", () => {
  it("round-trips a valid project", () => {
    expect(parseProjectJson(JSON.stringify(DEFAULT_PROJECT))).toEqual({
      ok: true,
      project: DEFAULT_PROJECT,
    });
  });

  it("round-trips a typed power plan action", () => {
    const project = { ...DEFAULT_PROJECT, actions: [powerAction()] };
    expect(parseProjectJson(JSON.stringify(project))).toEqual({ ok: true, project });
  });

  it("round-trips a full-size project within the JSON import contract", () => {
    const project: RegistryProject = {
      ...DEFAULT_PROJECT,
      tweaks: Array.from({ length: MAX_TWEAKS }, (_, index) => tweak({
        id: `item_${index.toString().padStart(3, "0")}`,
        valueName: `Value${index}`,
        valueType: "REG_SZ",
        data: "x".repeat(2000),
      })),
    };
    const json = JSON.stringify(project, null, 2);
    expect(new TextEncoder().encode(json).length).toBeLessThanOrEqual(MAX_PROJECT_JSON_BYTES);
    expect(parseProjectJson(json)).toEqual({ ok: true, project });
  });

  it("rejects unknown fields without mutating a model", () => {
    const json = JSON.stringify(DEFAULT_PROJECT).replace(
      '"version":2',
      '"version":2,"__proto__":{"polluted":true}',
    );
    const result = parseProjectJson(json);
    expect(result.ok).toBe(false);
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });

  it("rejects oversized JSON before parsing", () => {
    expect(parseProjectJson(" ".repeat(MAX_PROJECT_JSON_BYTES + 1))).toEqual({
      ok: false,
      errors: [`JSONは${MAX_PROJECT_JSON_BYTES / 1_048_576}MB以下にしてください`],
    });
  });

  it("migrates a schema v1 project without a banner style", () => {
    const legacy = JSON.parse(JSON.stringify(DEFAULT_PROJECT)) as Record<string, unknown>;
    legacy["version"] = 1;
    delete legacy["bannerStyle"];
    delete legacy["actions"];
    const result = parseProjectJson(JSON.stringify(legacy));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.bannerStyle).toBe("drift");
      expect(result.project.version).toBe(2);
      expect(result.project.actions).toEqual([]);
    }
  });

  it("rejects unknown action fields and kinds", () => {
    const unknownField = powerAction() as PowerPlanAction & { extra?: string };
    unknownField.extra = "no";
    expect(parseProjectJson(JSON.stringify({ ...DEFAULT_PROJECT, actions: [unknownField] })).ok).toBe(false);
    const unknownKind = { ...powerAction(), kind: "command" };
    expect(parseProjectJson(JSON.stringify({ ...DEFAULT_PROJECT, actions: [unknownKind] })).ok).toBe(false);
  });
});
