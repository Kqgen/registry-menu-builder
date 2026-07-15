import type {
  RegistryHive,
  RegistryOperation,
  RegistryValueType,
} from "../domain/types.ts";

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

const HIVE_NAMES: Readonly<Record<string, RegistryHive>> = {
  HKEY_CURRENT_USER: "HKCU",
  HKEY_LOCAL_MACHINE: "HKLM",
  HKEY_CLASSES_ROOT: "HKCR",
  HKEY_USERS: "HKU",
  HKEY_CURRENT_CONFIG: "HKCC",
};

function decode(bytes: Uint8Array): string {
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
    throw new Error(".regファイルはUTF-16LEまたはUTF-8で保存してください");
  }
}

function logicalLines(text: string): readonly { readonly number: number; readonly text: string }[] {
  const physical = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const lines: { number: number; text: string }[] = [];
  for (let index = 0; index < physical.length; index += 1) {
    const start = index + 1;
    let line = physical[index] ?? "";
    while (/\\\s*$/u.test(line)) {
      line = line.replace(/\\\s*$/u, "");
      index += 1;
      if (index >= physical.length) {
        throw new Error(`${start}行目: 継続行が途中で終わっています`);
      }
      line += (physical[index] ?? "").trimStart();
    }
    lines.push({ number: start, text: line });
  }
  return lines;
}

function unescapeQuoted(value: string, line: number): string {
  let result = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character !== "\\") {
      result += character;
      continue;
    }
    const next = value[index + 1];
    if (next !== "\\" && next !== '"') {
      throw new Error(`${line}行目: 引用文字列のエスケープが不正です`);
    }
    result += next;
    index += 1;
  }
  return result;
}

function parseBytes(value: string, line: number): readonly number[] {
  const normalized = value.replaceAll(/\s/gu, "");
  if (normalized.length === 0) {
    return [];
  }
  const tokens = normalized.split(",");
  if (tokens.some((token) => !/^[0-9a-f]{2}$/iu.test(token))) {
    throw new Error(`${line}行目: hexデータは2桁の16進バイトで指定してください`);
  }
  return tokens.map((token) => Number.parseInt(token, 16));
}

function decodeUtf16(bytes: readonly number[], line: number): string {
  if (bytes.length % 2 !== 0) {
    throw new Error(`${line}行目: UTF-16データのバイト数が不正です`);
  }
  const value = new TextDecoder("utf-16le", { fatal: true }).decode(Uint8Array.from(bytes));
  return value.replace(/\0+$/u, "");
}

interface ParsedData {
  readonly operation: RegistryOperation;
  readonly valueType: RegistryValueType;
  readonly data: string;
}

function parseData(value: string, line: number): ParsedData {
  if (value === "-") {
    return { operation: "delete", valueType: "REG_SZ", data: "" };
  }
  const stringMatch = /^"((?:\\.|[^"\\])*)"$/u.exec(value);
  if (stringMatch !== null) {
    return { operation: "set", valueType: "REG_SZ", data: unescapeQuoted(stringMatch[1] ?? "", line) };
  }
  const dwordMatch = /^dword:([0-9a-f]{1,8})$/iu.exec(value);
  if (dwordMatch !== null) {
    return { operation: "set", valueType: "REG_DWORD", data: `0x${dwordMatch[1]}` };
  }
  const hexMatch = /^hex(?:\(([0-9a-f]+)\))?:(.*)$/iu.exec(value);
  if (hexMatch === null) {
    throw new Error(`${line}行目: 対応していない値データです`);
  }
  const kind = (hexMatch[1] ?? "").toLowerCase();
  const bytes = parseBytes(hexMatch[2] ?? "", line);
  if (kind === "") {
    return { operation: "set", valueType: "REG_BINARY", data: bytes.map((byte) => byte.toString(16).padStart(2, "0")).join(" ") };
  }
  if (kind === "1" || kind === "2") {
    return { operation: "set", valueType: kind === "1" ? "REG_SZ" : "REG_EXPAND_SZ", data: decodeUtf16(bytes, line) };
  }
  if (kind === "7") {
    const items = decodeUtf16(bytes, line).split("\0").filter((item) => item.length > 0);
    return { operation: "set", valueType: "REG_MULTI_SZ", data: items.join("\n") };
  }
  if (kind === "4" || kind === "b") {
    const expected = kind === "4" ? 4 : 8;
    if (bytes.length !== expected) {
      throw new Error(`${line}行目: 数値データは${expected}バイト必要です`);
    }
    const number = bytes.reduceRight((result, byte) => (result << 8n) + BigInt(byte), 0n);
    return { operation: "set", valueType: kind === "4" ? "REG_DWORD" : "REG_QWORD", data: `0x${number.toString(16)}` };
  }
  throw new Error(`${line}行目: hex(${kind})の値型には対応していません`);
}

function targetKey(value: ImportedRegistryValue): string {
  return `${value.hive}\\${value.keyPath}\\${value.valueName}`.toLocaleLowerCase("en-US");
}

export function parseRegFile(bytes: Uint8Array, sourceName: string): RegImportResult {
  if (bytes.length > 2_097_152) {
    throw new Error(`${sourceName}: 2MBを超える.regファイルは読み込めません`);
  }
  const lines = logicalLines(decode(bytes));
  const first = lines.findIndex((line) => line.text.trim().length > 0);
  if (first < 0 || !/^(?:Windows Registry Editor Version 5\.00|REGEDIT4)$/iu.test(lines[first]?.text.trim() ?? "")) {
    throw new Error(`${sourceName}: .regヘッダーが見つかりません`);
  }
  let section: { readonly hive: RegistryHive; readonly keyPath: string } | undefined;
  const imported = new Map<string, ImportedRegistryValue>();
  const warnings: string[] = [];
  for (const line of lines.slice(first + 1)) {
    const value = line.text.trim();
    if (value.length === 0 || value.startsWith(";") || value.startsWith("#")) {
      continue;
    }
    if (value.startsWith("[-")) {
      throw new Error(`${sourceName}:${line.number}: キー全体の削除は安全に変換できません`);
    }
    const sectionMatch = /^\[([^\\\]]+)(?:\\([^\]]+))?\]$/u.exec(value);
    if (sectionMatch !== null) {
      const hive = HIVE_NAMES[(sectionMatch[1] ?? "").toUpperCase()];
      const keyPath = sectionMatch[2] ?? "";
      if (hive === undefined || keyPath.length === 0) {
        throw new Error(`${sourceName}:${line.number}: 対応していないレジストリキーです`);
      }
      section = { hive, keyPath };
      continue;
    }
    if (section === undefined) {
      throw new Error(`${sourceName}:${line.number}: 値より先にレジストリキーを指定してください`);
    }
    const defaultMatch = /^@=(.*)$/u.exec(value);
    const namedMatch = /^"((?:\\.|[^"\\])*)"=(.*)$/u.exec(value);
    if (defaultMatch === null && namedMatch === null) {
      throw new Error(`${sourceName}:${line.number}: 値の構文が不正です`);
    }
    const valueName = defaultMatch !== null ? "" : unescapeQuoted(namedMatch?.[1] ?? "", line.number);
    const parsed = parseData((defaultMatch?.[1] ?? namedMatch?.[2] ?? "").trim(), line.number);
    const entry = { sourceName, ...section, valueName, ...parsed };
    const key = targetKey(entry);
    if (imported.has(key)) {
      warnings.push(`${sourceName}:${line.number}: 同じ対象の後の指定を優先しました`);
    }
    imported.set(key, entry);
  }
  if (imported.size === 0) {
    throw new Error(`${sourceName}: 取り込めるレジストリ値がありません`);
  }
  return { values: [...imported.values()], warnings };
}
