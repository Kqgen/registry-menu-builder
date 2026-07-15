import {
  BANNER_STYLE_IDS,
  HIVES,
  OPERATIONS,
  RISK_LEVELS,
  THEME_IDS,
  VALUE_TYPES,
  type ParsedRegistryData,
  type RegistryProject,
  type RegistryTweak,
  type RegistryValueType,
  type ValidationIssue,
} from "./types.ts";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const SAFE_ID = /^[a-z][a-z0-9_]{2,47}$/u;
const BANNER_TEXT = /^[A-Za-z0-9 -]+$/u;

function parseInteger(data: string, max: bigint): bigint {
  const normalized = data.trim();
  if (!/^(?:0[xX][0-9a-fA-F]+|[0-9]+)$/u.test(normalized)) {
    throw new Error("10進数または0xで始まる16進数を入力してください");
  }
  const value = BigInt(normalized);
  if (value < 0n || value > max) {
    throw new Error(`0〜${max.toString()}の範囲で入力してください`);
  }
  return value;
}

export function parseRegistryData(
  valueType: RegistryValueType,
  data: string,
): ParsedRegistryData {
  if (valueType === "REG_SZ" || valueType === "REG_EXPAND_SZ") {
    return { kind: "string", value: data };
  }
  if (valueType === "REG_MULTI_SZ") {
    const value = data.length === 0 ? [] : data.replaceAll("\r\n", "\n").split("\n");
    return { kind: "multi", value };
  }
  if (valueType === "REG_BINARY") {
    const normalized = data.trim();
    if (normalized.length === 0) {
      return { kind: "binary", value: [] };
    }
    const tokens = normalized.split(/[\s,;-]+/u);
    if (tokens.some((token) => !/^[0-9a-fA-F]{2}$/u.test(token))) {
      throw new Error("2桁の16進バイトを空白かカンマで区切ってください");
    }
    return {
      kind: "binary",
      value: tokens.map((token) => Number.parseInt(token, 16)),
    };
  }
  if (valueType === "REG_DWORD") {
    return { kind: "integer", value: parseInteger(data, 0xffff_ffffn) };
  }
  return {
    kind: "integer",
    value: parseInteger(data, 0xffff_ffff_ffff_ffffn),
  };
}

function pushTextIssue(
  issues: ValidationIssue[],
  path: string,
  value: string,
  label: string,
  maxLength: number,
): void {
  if (value.trim().length === 0) {
    issues.push({ path, message: `${label}は必須です` });
  } else if (value.length > maxLength) {
    issues.push({ path, message: `${label}は${maxLength}文字以内です` });
  } else if (CONTROL_CHARACTERS.test(value)) {
    issues.push({ path, message: `${label}に制御文字は使えません` });
  }
}

function pushOptionalTextIssue(
  issues: ValidationIssue[],
  path: string,
  value: string,
  label: string,
  maxLength: number,
): void {
  if (value.length > maxLength) {
    issues.push({ path, message: `${label}は${maxLength}文字以内です` });
  } else if (CONTROL_CHARACTERS.test(value)) {
    issues.push({ path, message: `${label}に制御文字は使えません` });
  }
}

export function validateTweak(
  tweak: RegistryTweak,
  path = "tweak",
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!SAFE_ID.test(tweak.id)) {
    issues.push({ path: `${path}.id`, message: "内部IDの形式が不正です" });
  }
  pushTextIssue(issues, `${path}.label`, tweak.label, "表示名", 60);
  pushTextIssue(issues, `${path}.group`, tweak.group, "グループ", 40);
  pushTextIssue(issues, `${path}.description`, tweak.description, "説明", 120);
  pushTextIssue(issues, `${path}.keyPath`, tweak.keyPath, "キーパス", 220);
  pushOptionalTextIssue(issues, `${path}.valueName`, tweak.valueName, "値の名前", 160);
  if (!HIVES.includes(tweak.hive)) {
    issues.push({ path: `${path}.hive`, message: "レジストリハイブが不正です" });
  }
  if (!OPERATIONS.includes(tweak.operation)) {
    issues.push({ path: `${path}.operation`, message: "Tweak操作が不正です" });
  }
  if (!VALUE_TYPES.includes(tweak.valueType)) {
    issues.push({ path: `${path}.valueType`, message: "値の種類が不正です" });
  }
  if (!RISK_LEVELS.includes(tweak.risk)) {
    issues.push({ path: `${path}.risk`, message: "注意度が不正です" });
  }
  if (
    tweak.keyPath.startsWith("\\") ||
    tweak.keyPath.endsWith("\\") ||
    tweak.keyPath.includes("\\\\") ||
    /^(?:Registry::|[A-Za-z_]+:)/iu.test(tweak.keyPath) ||
    /[*?\[\]]/u.test(tweak.keyPath)
  ) {
    issues.push({
      path: `${path}.keyPath`,
      message: "キーパスにハイブ、プロバイダー、リモート指定、空の階層は含められません",
    });
  }
  if (tweak.operation === "set") {
    if (tweak.data.length > 2000) {
      issues.push({ path: `${path}.data`, message: "データは2000文字以内です" });
    } else if (
      tweak.valueType === "REG_MULTI_SZ"
        ? /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(tweak.data)
        : CONTROL_CHARACTERS.test(tweak.data)
    ) {
      issues.push({ path: `${path}.data`, message: "データに使用できない制御文字があります" });
    } else {
      try {
        parseRegistryData(tweak.valueType, tweak.data);
      } catch (error) {
        issues.push({
          path: `${path}.data`,
          message: error instanceof Error ? error.message : "データの形式が不正です",
        });
      }
    }
  }
  return issues;
}

export function validateProject(project: RegistryProject): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!SAFE_ID.test(project.projectId)) {
    issues.push({ path: "projectId", message: "プロジェクトIDの形式が不正です" });
  }
  pushTextIssue(issues, "title", project.title, "ツール名", 60);
  pushTextIssue(issues, "subtitle", project.subtitle, "サブタイトル", 80);
  if (!THEME_IDS.includes(project.theme)) {
    issues.push({ path: "theme", message: "コンソールテーマが不正です" });
  }
  if (!BANNER_TEXT.test(project.bannerText) || project.bannerText.length > 14) {
    issues.push({
      path: "bannerText",
      message: "ASCII文字はA–Z、0–9、空白、ハイフンの14文字以内です",
    });
  }
  if (!BANNER_STYLE_IDS.includes(project.bannerStyle)) {
    issues.push({ path: "bannerStyle", message: "ASCIIスタイルが不正です" });
  }
  if (project.tweaks.length === 0) {
    issues.push({ path: "tweaks", message: "Gaming Tweakを1件以上追加してください" });
  }
  if (project.tweaks.length > 40) {
    issues.push({ path: "tweaks", message: "Gaming Tweakは40件までです" });
  }
  const ids = new Set<string>();
  const targets = new Set<string>();
  for (const [index, tweak] of project.tweaks.entries()) {
    issues.push(...validateTweak(tweak, `tweaks.${index}`));
    if (ids.has(tweak.id)) {
      issues.push({ path: `tweaks.${index}.id`, message: "内部IDが重複しています" });
    }
    ids.add(tweak.id);
    const target = `${tweak.hive}\\${tweak.keyPath}\\${tweak.valueName}`.toLocaleLowerCase("en-US");
    if (targets.has(target)) {
      issues.push({ path: `tweaks.${index}`, message: "同じレジストリ値が重複しています" });
    }
    targets.add(target);
  }
  return issues;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEnumValue<const T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function parseTweak(value: unknown): RegistryTweak | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const stringKeys = ["id", "label", "group", "description", "keyPath", "valueName", "data"] as const;
  const exactKeys = [...stringKeys, "hive", "operation", "valueType", "risk"];
  if (!hasExactKeys(value, exactKeys)) {
    return undefined;
  }
  if (stringKeys.some((key) => typeof value[key] !== "string")) {
    return undefined;
  }
  if (
    !isEnumValue(HIVES, value["hive"]) ||
    !isEnumValue(OPERATIONS, value["operation"]) ||
    !isEnumValue(VALUE_TYPES, value["valueType"]) ||
    !isEnumValue(RISK_LEVELS, value["risk"])
  ) {
    return undefined;
  }
  return {
    id: value["id"] as string,
    label: value["label"] as string,
    group: value["group"] as string,
    description: value["description"] as string,
    hive: value["hive"],
    keyPath: value["keyPath"] as string,
    valueName: value["valueName"] as string,
    operation: value["operation"],
    valueType: value["valueType"],
    data: value["data"] as string,
    risk: value["risk"],
  };
}

export type ProjectParseResult =
  | { readonly ok: true; readonly project: RegistryProject }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseProjectJson(json: string): ProjectParseResult {
  if (json.length > 262_144) {
    return { ok: false, errors: ["JSONは256KB以下にしてください"] };
  }
  let value: unknown;
  try {
    value = JSON.parse(json) as unknown;
  } catch {
    return { ok: false, errors: ["JSONの構文が不正です"] };
  }
  if (!isRecord(value) || value["version"] !== 1 || !Array.isArray(value["tweaks"])) {
    return { ok: false, errors: ["schema v1のプロジェクトではありません"] };
  }
  const legacyKeys = ["version", "projectId", "title", "bannerText", "subtitle", "theme", "tweaks"];
  const currentKeys = [...legacyKeys, "bannerStyle"];
  if (!hasExactKeys(value, legacyKeys) && !hasExactKeys(value, currentKeys)) {
    return { ok: false, errors: ["未対応のプロジェクト項目が含まれています"] };
  }
  if (
    typeof value["projectId"] !== "string" ||
    typeof value["title"] !== "string" ||
    typeof value["bannerText"] !== "string" ||
    typeof value["subtitle"] !== "string" ||
    !isEnumValue(THEME_IDS, value["theme"]) ||
    (value["bannerStyle"] !== undefined && !isEnumValue(BANNER_STYLE_IDS, value["bannerStyle"]))
  ) {
    return { ok: false, errors: ["プロジェクト情報の型が不正です"] };
  }
  const tweaks = value["tweaks"].map(parseTweak);
  if (tweaks.some((tweak) => tweak === undefined)) {
    return { ok: false, errors: ["Gaming Tweakの型が不正です"] };
  }
  const project: RegistryProject = {
    version: 1,
    projectId: value["projectId"],
    title: value["title"],
    bannerText: value["bannerText"],
    bannerStyle: value["bannerStyle"] === undefined ? "drift" : value["bannerStyle"],
    subtitle: value["subtitle"],
    theme: value["theme"],
    tweaks: tweaks as RegistryTweak[],
  };
  const issues = validateProject(project);
  if (issues.length > 0) {
    return { ok: false, errors: issues.map((issue) => issue.message) };
  }
  return { ok: true, project };
}
