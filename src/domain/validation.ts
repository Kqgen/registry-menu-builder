import {
  BANNER_STYLE_IDS,
  HIVES,
  MAX_PROJECT_JSON_BYTES,
  MAX_TWEAKS,
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
import { VALIDATION_COPY, type ValidationCopy } from "../i18n/domainCopy.ts";
import type { AppLocale } from "../i18n/locale.ts";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const SAFE_ID = /^[a-z][a-z0-9_]{2,47}$/u;
const BANNER_TEXT = /^[A-Za-z0-9 -]+$/u;

function parseInteger(data: string, max: bigint, copy: ValidationCopy): bigint {
  const normalized = data.trim();
  if (!/^(?:0[xX][0-9a-fA-F]+|[0-9]+)$/u.test(normalized)) {
    throw new Error(copy.decimalOrHex);
  }
  const value = BigInt(normalized);
  if (value < 0n || value > max) {
    throw new Error(copy.integerRange(max.toString()));
  }
  return value;
}

export function parseRegistryData(
  valueType: RegistryValueType,
  data: string,
  locale: AppLocale = "ja",
): ParsedRegistryData {
  const copy = VALIDATION_COPY[locale];
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
      throw new Error(copy.binaryBytes);
    }
    return {
      kind: "binary",
      value: tokens.map((token) => Number.parseInt(token, 16)),
    };
  }
  if (valueType === "REG_DWORD") {
    return { kind: "integer", value: parseInteger(data, 0xffff_ffffn, copy) };
  }
  return {
    kind: "integer",
    value: parseInteger(data, 0xffff_ffff_ffff_ffffn, copy),
  };
}

function pushTextIssue(
  issues: ValidationIssue[],
  path: string,
  value: string,
  label: string,
  maxLength: number,
  copy: ValidationCopy,
): void {
  if (value.trim().length === 0) {
    issues.push({ path, message: copy.required(label) });
  } else if (value.length > maxLength) {
    issues.push({ path, message: copy.maxLength(label, maxLength) });
  } else if (CONTROL_CHARACTERS.test(value)) {
    issues.push({ path, message: copy.controlCharacters(label) });
  }
}

function pushOptionalTextIssue(
  issues: ValidationIssue[],
  path: string,
  value: string,
  label: string,
  maxLength: number,
  copy: ValidationCopy,
): void {
  if (value.length > maxLength) {
    issues.push({ path, message: copy.maxLength(label, maxLength) });
  } else if (CONTROL_CHARACTERS.test(value)) {
    issues.push({ path, message: copy.controlCharacters(label) });
  }
}

export function validateTweak(
  tweak: RegistryTweak,
  path = "tweak",
  locale: AppLocale = "ja",
): ValidationIssue[] {
  const copy = VALIDATION_COPY[locale];
  const issues: ValidationIssue[] = [];
  if (!SAFE_ID.test(tweak.id)) {
    issues.push({ path: `${path}.id`, message: copy.internalIdInvalid });
  }
  pushTextIssue(issues, `${path}.label`, tweak.label, copy.labels.displayName, 60, copy);
  pushTextIssue(issues, `${path}.group`, tweak.group, copy.labels.group, 40, copy);
  pushTextIssue(issues, `${path}.description`, tweak.description, copy.labels.description, 120, copy);
  pushTextIssue(issues, `${path}.keyPath`, tweak.keyPath, copy.labels.keyPath, 220, copy);
  pushOptionalTextIssue(issues, `${path}.valueName`, tweak.valueName, copy.labels.valueName, 160, copy);
  if (!HIVES.includes(tweak.hive)) {
    issues.push({ path: `${path}.hive`, message: copy.hiveInvalid });
  }
  if (!OPERATIONS.includes(tweak.operation)) {
    issues.push({ path: `${path}.operation`, message: copy.operationInvalid });
  }
  if (!VALUE_TYPES.includes(tweak.valueType)) {
    issues.push({ path: `${path}.valueType`, message: copy.valueTypeInvalid });
  }
  if (!RISK_LEVELS.includes(tweak.risk)) {
    issues.push({ path: `${path}.risk`, message: copy.riskInvalid });
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
      message: copy.keyPathInvalid,
    });
  }
  if (tweak.operation === "set") {
    if (tweak.data.length > 2000) {
      issues.push({ path: `${path}.data`, message: copy.dataTooLong });
    } else if (
      tweak.valueType === "REG_MULTI_SZ"
        ? /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(tweak.data)
        : CONTROL_CHARACTERS.test(tweak.data)
    ) {
      issues.push({ path: `${path}.data`, message: copy.dataControlCharacters });
    } else {
      try {
        parseRegistryData(tweak.valueType, tweak.data, locale);
      } catch (error) {
        issues.push({
          path: `${path}.data`,
          message: error instanceof Error ? error.message : copy.dataInvalid,
        });
      }
    }
  }
  return issues;
}

export function validateProject(project: RegistryProject, locale: AppLocale = "ja"): ValidationIssue[] {
  const copy = VALIDATION_COPY[locale];
  const issues: ValidationIssue[] = [];
  if (!SAFE_ID.test(project.projectId)) {
    issues.push({ path: "projectId", message: copy.projectIdInvalid });
  }
  pushTextIssue(issues, "title", project.title, copy.labels.toolName, 60, copy);
  pushTextIssue(issues, "subtitle", project.subtitle, copy.labels.subtitle, 80, copy);
  if (!THEME_IDS.includes(project.theme)) {
    issues.push({ path: "theme", message: copy.themeInvalid });
  }
  if (!BANNER_TEXT.test(project.bannerText) || project.bannerText.length > 14) {
    issues.push({
      path: "bannerText",
      message: copy.bannerTextInvalid,
    });
  }
  if (!BANNER_STYLE_IDS.includes(project.bannerStyle)) {
    issues.push({ path: "bannerStyle", message: copy.bannerStyleInvalid });
  }
  if (project.tweaks.length === 0) {
    issues.push({ path: "tweaks", message: copy.tweakRequired });
  }
  if (project.tweaks.length > MAX_TWEAKS) {
    issues.push({ path: "tweaks", message: copy.tooManyTweaks(MAX_TWEAKS) });
  }
  const ids = new Set<string>();
  const targets = new Set<string>();
  for (const [index, tweak] of project.tweaks.entries()) {
    issues.push(...validateTweak(tweak, `tweaks.${index}`, locale));
    if (ids.has(tweak.id)) {
      issues.push({ path: `tweaks.${index}.id`, message: copy.duplicateId });
    }
    ids.add(tweak.id);
    const target = `${tweak.hive}\\${tweak.keyPath}\\${tweak.valueName}`.toLocaleLowerCase("en-US");
    if (targets.has(target)) {
      issues.push({ path: `tweaks.${index}`, message: copy.duplicateTarget });
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

export function parseProjectJson(json: string, locale: AppLocale = "ja"): ProjectParseResult {
  const copy = VALIDATION_COPY[locale];
  if (
    json.length > MAX_PROJECT_JSON_BYTES ||
    new TextEncoder().encode(json).length > MAX_PROJECT_JSON_BYTES
  ) {
    return {
      ok: false,
      errors: [copy.jsonTooLarge(MAX_PROJECT_JSON_BYTES / 1_048_576)],
    };
  }
  let value: unknown;
  try {
    value = JSON.parse(json) as unknown;
  } catch {
    return { ok: false, errors: [copy.jsonSyntaxInvalid] };
  }
  if (!isRecord(value) || value["version"] !== 1 || !Array.isArray(value["tweaks"])) {
    return { ok: false, errors: [copy.schemaInvalid] };
  }
  const legacyKeys = ["version", "projectId", "title", "bannerText", "subtitle", "theme", "tweaks"];
  const currentKeys = [...legacyKeys, "bannerStyle"];
  if (!hasExactKeys(value, legacyKeys) && !hasExactKeys(value, currentKeys)) {
    return { ok: false, errors: [copy.unsupportedProjectFields] };
  }
  if (
    typeof value["projectId"] !== "string" ||
    typeof value["title"] !== "string" ||
    typeof value["bannerText"] !== "string" ||
    typeof value["subtitle"] !== "string" ||
    !isEnumValue(THEME_IDS, value["theme"]) ||
    (value["bannerStyle"] !== undefined && !isEnumValue(BANNER_STYLE_IDS, value["bannerStyle"]))
  ) {
    return { ok: false, errors: [copy.projectTypeInvalid] };
  }
  const tweaks = value["tweaks"].map(parseTweak);
  if (tweaks.some((tweak) => tweak === undefined)) {
    return { ok: false, errors: [copy.tweakTypeInvalid] };
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
  const issues = validateProject(project, locale);
  if (issues.length > 0) {
    return { ok: false, errors: issues.map((issue) => issue.message) };
  }
  return { ok: true, project };
}
