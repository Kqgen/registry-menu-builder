import type {
  RegistryHive,
  RegistryOperation,
  RegistryValueType,
} from "../domain/types.ts";
import { REG_IMPORT_COPY, type RegImportCopy } from "../i18n/domainCopy.ts";
import type { AppLocale } from "../i18n/locale.ts";

export interface ImportedRegistryValue {
  readonly sourceName: string;
  readonly hive: RegistryHive;
  readonly keyPath: string;
  readonly valueName: string;
  readonly operation: RegistryOperation;
  readonly valueType: RegistryValueType;
  readonly data: string;
}

export interface RegImportResult {
  readonly values: readonly ImportedRegistryValue[];
  readonly warnings: readonly string[];
}

export class RegImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegImportError";
  }
}

export const MAX_REG_FILE_BYTES = 32 * 1_048_576;
export const MAX_REG_IMPORT_BYTES = MAX_REG_FILE_BYTES;

const HIVE_NAMES: Readonly<Record<string, RegistryHive>> = {
  HKEY_CURRENT_USER: "HKCU",
  HKEY_LOCAL_MACHINE: "HKLM",
  HKEY_CLASSES_ROOT: "HKCR",
  HKEY_USERS: "HKU",
  HKEY_CURRENT_CONFIG: "HKCC",
};

function decode(bytes: Uint8Array, copy: RegImportCopy): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le", { fatal: true }).decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be", { fatal: true }).decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(3));
  }
  const sample = bytes.subarray(0, Math.min(bytes.length, 128));
  const oddNulls = [...sample].filter((value, index) => index % 2 === 1 && value === 0).length;
  if (oddNulls > sample.length / 8) {
    return new TextDecoder("utf-16le", { fatal: true }).decode(bytes);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new RegImportError(copy.encodingInvalid);
  }
}

function logicalLines(
  text: string,
  copy: RegImportCopy,
): readonly { readonly number: number; readonly text: string }[] {
  const physical = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const lines: { number: number; text: string }[] = [];
  for (let index = 0; index < physical.length; index += 1) {
    const start = index + 1;
    let line = physical[index] ?? "";
    while (/\\\s*$/u.test(line)) {
      line = line.replace(/\\\s*$/u, "");
      index += 1;
      if (index >= physical.length) {
        throw new RegImportError(copy.continuationEnded(start));
      }
      line += (physical[index] ?? "").trimStart();
    }
    lines.push({ number: start, text: line });
  }
  return lines;
}

function unescapeQuoted(value: string, line: number, copy: RegImportCopy): string {
  let result = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character !== "\\") {
      result += character;
      continue;
    }
    const next = value[index + 1];
    if (next !== "\\" && next !== '"') {
      throw new RegImportError(copy.quotedEscapeInvalid(line));
    }
    result += next;
    index += 1;
  }
  return result;
}

function stripTrailingComment(value: string): string {
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quoted && character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && character === ";" && /\s/u.test(value[index - 1] ?? "")) {
      return value.slice(0, index).trimEnd();
    }
  }
  return value;
}

function parseBytes(value: string, line: number, copy: RegImportCopy): readonly number[] {
  const normalized = value.replaceAll(/\s/gu, "");
  if (normalized.length === 0) {
    return [];
  }
  const tokens = normalized.split(",");
  if (tokens.some((token) => !/^[0-9a-f]{2}$/iu.test(token))) {
    throw new RegImportError(copy.hexBytesInvalid(line));
  }
  return tokens.map((token) => Number.parseInt(token, 16));
}

function decodeUtf16(bytes: readonly number[], line: number, copy: RegImportCopy): string {
  if (bytes.length % 2 !== 0) {
    throw new RegImportError(copy.utf16ByteCountInvalid(line));
  }
  try {
    const value = new TextDecoder("utf-16le", { fatal: true }).decode(Uint8Array.from(bytes));
    return value.replace(/\0+$/u, "");
  } catch {
    throw new RegImportError(copy.utf16ByteCountInvalid(line));
  }
}

interface ParsedData {
  readonly operation: RegistryOperation;
  readonly valueType: RegistryValueType;
  readonly data: string;
}

function parseData(value: string, line: number, copy: RegImportCopy): ParsedData {
  if (value === "-") {
    return { operation: "delete", valueType: "REG_SZ", data: "" };
  }
  const stringMatch = /^"((?:\\.|[^"\\])*)"$/u.exec(value);
  if (stringMatch !== null) {
    return { operation: "set", valueType: "REG_SZ", data: unescapeQuoted(stringMatch[1] ?? "", line, copy) };
  }
  const dwordMatch = /^dword:([0-9a-f]{1,8})$/iu.exec(value);
  if (dwordMatch !== null) {
    return { operation: "set", valueType: "REG_DWORD", data: `0x${dwordMatch[1]}` };
  }
  const hexMatch = /^hex(?:\(([0-9a-f]+)\))?:(.*)$/iu.exec(value);
  if (hexMatch === null) {
    throw new RegImportError(copy.valueDataUnsupported(line));
  }
  const kind = (hexMatch[1] ?? "").toLowerCase();
  const bytes = parseBytes(hexMatch[2] ?? "", line, copy);
  if (kind === "" || kind === "3") {
    return { operation: "set", valueType: "REG_BINARY", data: bytes.map((byte) => byte.toString(16).padStart(2, "0")).join(" ") };
  }
  if (kind === "1" || kind === "2") {
    return { operation: "set", valueType: kind === "1" ? "REG_SZ" : "REG_EXPAND_SZ", data: decodeUtf16(bytes, line, copy) };
  }
  if (kind === "7") {
    const items = decodeUtf16(bytes, line, copy).split("\0").filter((item) => item.length > 0);
    return { operation: "set", valueType: "REG_MULTI_SZ", data: items.join("\n") };
  }
  if (kind === "4" || kind === "b") {
    const expected = kind === "4" ? 4 : 8;
    if (bytes.length !== expected) {
      throw new RegImportError(copy.numericByteCount(line, expected));
    }
    const number = bytes.reduceRight((result, byte) => (result << 8n) + BigInt(byte), 0n);
    return { operation: "set", valueType: kind === "4" ? "REG_DWORD" : "REG_QWORD", data: `0x${number.toString(16)}` };
  }
  throw new RegImportError(copy.hexTypeUnsupported(line, kind));
}

function targetKey(value: ImportedRegistryValue): string {
  return `${value.hive}\\${value.keyPath}\\${value.valueName}`.toLocaleLowerCase("en-US");
}

export function parseRegFile(
  bytes: Uint8Array,
  sourceName: string,
  locale: AppLocale = "ja",
): RegImportResult {
  const copy = REG_IMPORT_COPY[locale];
  if (bytes.length > MAX_REG_FILE_BYTES) {
    throw new RegImportError(copy.fileTooLarge(sourceName, MAX_REG_FILE_BYTES / 1_048_576));
  }
  let lines: readonly { readonly number: number; readonly text: string }[];
  try {
    lines = logicalLines(decode(bytes, copy), copy);
  } catch (error) {
    if (error instanceof RegImportError) {
      throw error;
    }
    throw new RegImportError(copy.encodingInvalid);
  }
  const first = lines.findIndex((line) => line.text.trim().length > 0);
  if (first < 0 || !/^(?:Windows Registry Editor Version 5\.00|REGEDIT4)$/iu.test(lines[first]?.text.trim() ?? "")) {
    throw new RegImportError(copy.headerMissing(sourceName));
  }
  let section: { readonly hive: RegistryHive; readonly keyPath: string } | undefined;
  const imported = new Map<string, ImportedRegistryValue>();
  const warnings: string[] = [];
  for (const line of lines.slice(first + 1)) {
    const source = line.text.trim();
    if (source.length === 0 || source.startsWith(";") || source.startsWith("#")) {
      continue;
    }
    const value = source;
    if (value.startsWith("[-")) {
      throw new RegImportError(copy.keyDeleteUnsupported(sourceName, line.number));
    }
    const sectionMatch = /^\[([^\\\]]+)(?:\\([^\]]+))?\]$/u.exec(value);
    if (sectionMatch !== null) {
      const hive = HIVE_NAMES[(sectionMatch[1] ?? "").toUpperCase()];
      const keyPath = sectionMatch[2] ?? "";
      if (hive === undefined || keyPath.length === 0) {
        throw new RegImportError(copy.keyUnsupported(sourceName, line.number));
      }
      section = { hive, keyPath };
      continue;
    }
    if (section === undefined) {
      throw new RegImportError(copy.valueBeforeKey(sourceName, line.number));
    }
    const defaultMatch = /^@=(.*)$/u.exec(value);
    const namedMatch = /^"((?:\\.|[^"\\])*)"=(.*)$/u.exec(value);
    if (defaultMatch === null && namedMatch === null) {
      throw new RegImportError(copy.valueSyntaxInvalid(sourceName, line.number));
    }
    const valueName = defaultMatch !== null ? "" : unescapeQuoted(namedMatch?.[1] ?? "", line.number, copy);
    const data = stripTrailingComment(defaultMatch?.[1] ?? namedMatch?.[2] ?? "").trim();
    const parsed = parseData(data, line.number, copy);
    const entry = { sourceName, ...section, valueName, ...parsed };
    const key = targetKey(entry);
    if (imported.has(key)) {
      warnings.push(copy.duplicateTarget(sourceName, line.number));
    }
    imported.set(key, entry);
  }
  if (imported.size === 0) {
    throw new RegImportError(copy.noValues(sourceName));
  }
  return { values: [...imported.values()], warnings };
}
