import type { AppLocale } from "./locale.ts";

export interface ValidationCopy {
  readonly labels: {
    readonly displayName: string;
    readonly group: string;
    readonly description: string;
    readonly keyPath: string;
    readonly valueName: string;
    readonly toolName: string;
    readonly subtitle: string;
  };
  readonly decimalOrHex: string;
  readonly integerRange: (max: string) => string;
  readonly binaryBytes: string;
  readonly required: (label: string) => string;
  readonly maxLength: (label: string, max: number) => string;
  readonly controlCharacters: (label: string) => string;
  readonly internalIdInvalid: string;
  readonly hiveInvalid: string;
  readonly operationInvalid: string;
  readonly valueTypeInvalid: string;
  readonly riskInvalid: string;
  readonly keyPathInvalid: string;
  readonly dataTooLong: string;
  readonly dataControlCharacters: string;
  readonly dataInvalid: string;
  readonly projectIdInvalid: string;
  readonly themeInvalid: string;
  readonly bannerTextInvalid: string;
  readonly bannerStyleInvalid: string;
  readonly tweakRequired: string;
  readonly tooManyTweaks: (max: number) => string;
  readonly duplicateId: string;
  readonly duplicateTarget: string;
  readonly jsonTooLarge: (megabytes: number) => string;
  readonly jsonSyntaxInvalid: string;
  readonly schemaInvalid: string;
  readonly unsupportedProjectFields: string;
  readonly projectTypeInvalid: string;
  readonly tweakTypeInvalid: string;
}

export const VALIDATION_COPY: Readonly<Record<AppLocale, ValidationCopy>> = {
  ja: {
    labels: {
      displayName: "表示名",
      group: "グループ",
      description: "説明",
      keyPath: "キーパス",
      valueName: "値の名前",
      toolName: "ツール名",
      subtitle: "サブタイトル",
    },
    decimalOrHex: "10進数または0xで始まる16進数を入力してください",
    integerRange: (max) => `0〜${max}の範囲で入力してください`,
    binaryBytes: "2桁の16進バイトを空白かカンマで区切ってください",
    required: (label) => `${label}は必須です`,
    maxLength: (label, max) => `${label}は${max}文字以内です`,
    controlCharacters: (label) => `${label}に制御文字は使えません`,
    internalIdInvalid: "内部IDの形式が不正です",
    hiveInvalid: "レジストリハイブが不正です",
    operationInvalid: "Tweak操作が不正です",
    valueTypeInvalid: "値の種類が不正です",
    riskInvalid: "注意度が不正です",
    keyPathInvalid: "キーパスにハイブ、プロバイダー、リモート指定、空の階層は含められません",
    dataTooLong: "データは2000文字以内です",
    dataControlCharacters: "データに使用できない制御文字があります",
    dataInvalid: "データの形式が不正です",
    projectIdInvalid: "プロジェクトIDの形式が不正です",
    themeInvalid: "コンソールテーマが不正です",
    bannerTextInvalid: "ASCII文字はA–Z、0–9、空白、ハイフンの14文字以内です",
    bannerStyleInvalid: "ASCIIスタイルが不正です",
    tweakRequired: "Gaming Tweakを1件以上追加してください",
    tooManyTweaks: (max) => `Gaming Tweakは${max}件までです`,
    duplicateId: "内部IDが重複しています",
    duplicateTarget: "同じレジストリ値が重複しています",
    jsonTooLarge: (megabytes) => `JSONは${megabytes}MB以下にしてください`,
    jsonSyntaxInvalid: "JSONの構文が不正です",
    schemaInvalid: "schema v1のプロジェクトではありません",
    unsupportedProjectFields: "未対応のプロジェクト項目が含まれています",
    projectTypeInvalid: "プロジェクト情報の型が不正です",
    tweakTypeInvalid: "Gaming Tweakの型が不正です",
  },
  en: {
    labels: {
      displayName: "Display name",
      group: "Group",
      description: "Description",
      keyPath: "Key path",
      valueName: "Value name",
      toolName: "Tool name",
      subtitle: "Subtitle",
    },
    decimalOrHex: "Enter a decimal number or hexadecimal beginning with 0x",
    integerRange: (max) => `Enter a value from 0 through ${max}`,
    binaryBytes: "Separate two-digit hexadecimal bytes with spaces or commas",
    required: (label) => `${label} is required`,
    maxLength: (label, max) => `${label} must be ${max} characters or fewer`,
    controlCharacters: (label) => `${label} cannot contain control characters`,
    internalIdInvalid: "The internal ID format is invalid",
    hiveInvalid: "The registry hive is invalid",
    operationInvalid: "The tweak operation is invalid",
    valueTypeInvalid: "The value type is invalid",
    riskInvalid: "The risk level is invalid",
    keyPathInvalid: "The key path cannot include a hive, provider, remote target, wildcard, or empty segment",
    dataTooLong: "Data must be 2000 characters or fewer",
    dataControlCharacters: "Data contains unsupported control characters",
    dataInvalid: "The data format is invalid",
    projectIdInvalid: "The project ID format is invalid",
    themeInvalid: "The console theme is invalid",
    bannerTextInvalid: "ASCII text must contain only A–Z, 0–9, spaces, or hyphens and be no longer than 14 characters",
    bannerStyleInvalid: "The ASCII style is invalid",
    tweakRequired: "Add at least one gaming tweak",
    tooManyTweaks: (max) => `Gaming tweaks are limited to ${max}`,
    duplicateId: "An internal ID is duplicated",
    duplicateTarget: "The same registry value is targeted more than once",
    jsonTooLarge: (megabytes) => `JSON files must be ${megabytes} MB or smaller`,
    jsonSyntaxInvalid: "The JSON syntax is invalid",
    schemaInvalid: "This is not a schema v1 project",
    unsupportedProjectFields: "The project contains unsupported fields",
    projectTypeInvalid: "The project information has invalid types",
    tweakTypeInvalid: "A gaming tweak has invalid types",
  },
};

export interface RegImportCopy {
  readonly encodingInvalid: string;
  readonly continuationEnded: (line: number) => string;
  readonly quotedEscapeInvalid: (line: number) => string;
  readonly hexBytesInvalid: (line: number) => string;
  readonly utf16ByteCountInvalid: (line: number) => string;
  readonly valueDataUnsupported: (line: number) => string;
  readonly numericByteCount: (line: number, expected: number) => string;
  readonly hexTypeUnsupported: (line: number, kind: string) => string;
  readonly fileTooLarge: (source: string, megabytes: number) => string;
  readonly headerMissing: (source: string) => string;
  readonly keyDeleteUnsupported: (source: string, line: number) => string;
  readonly keyUnsupported: (source: string, line: number) => string;
  readonly valueBeforeKey: (source: string, line: number) => string;
  readonly valueSyntaxInvalid: (source: string, line: number) => string;
  readonly duplicateTarget: (source: string, line: number) => string;
  readonly noValues: (source: string) => string;
}

export const REG_IMPORT_COPY: Readonly<Record<AppLocale, RegImportCopy>> = {
  ja: {
    encodingInvalid: ".regファイルはUTF-16LEまたはUTF-8で保存してください",
    continuationEnded: (line) => `${line}行目: 継続行が途中で終わっています`,
    quotedEscapeInvalid: (line) => `${line}行目: 引用文字列のエスケープが不正です`,
    hexBytesInvalid: (line) => `${line}行目: hexデータは2桁の16進バイトで指定してください`,
    utf16ByteCountInvalid: (line) => `${line}行目: UTF-16データのバイト数が不正です`,
    valueDataUnsupported: (line) => `${line}行目: 対応していない値データです`,
    numericByteCount: (line, expected) => `${line}行目: 数値データは${expected}バイト必要です`,
    hexTypeUnsupported: (line, kind) => `${line}行目: hex(${kind})の値型には対応していません`,
    fileTooLarge: (source, megabytes) => `${source}: ${megabytes}MBを超える.regファイルは読み込めません`,
    headerMissing: (source) => `${source}: .regヘッダーが見つかりません`,
    keyDeleteUnsupported: (source, line) => `${source}:${line}: キー全体の削除は安全に変換できません`,
    keyUnsupported: (source, line) => `${source}:${line}: 対応していないレジストリキーです`,
    valueBeforeKey: (source, line) => `${source}:${line}: 値より先にレジストリキーを指定してください`,
    valueSyntaxInvalid: (source, line) => `${source}:${line}: 値の構文が不正です`,
    duplicateTarget: (source, line) => `${source}:${line}: 同じ対象の後の指定を優先しました`,
    noValues: (source) => `${source}: 取り込めるレジストリ値がありません`,
  },
  en: {
    encodingInvalid: ".reg files must be saved as UTF-16LE or UTF-8",
    continuationEnded: (line) => `Line ${line}: a continuation line ended unexpectedly`,
    quotedEscapeInvalid: (line) => `Line ${line}: the quoted string escape is invalid`,
    hexBytesInvalid: (line) => `Line ${line}: hex data must contain two-digit hexadecimal bytes`,
    utf16ByteCountInvalid: (line) => `Line ${line}: the UTF-16 data has an invalid byte count`,
    valueDataUnsupported: (line) => `Line ${line}: the registry value data is not supported`,
    numericByteCount: (line, expected) => `Line ${line}: numeric data requires ${expected} bytes`,
    hexTypeUnsupported: (line, kind) => `Line ${line}: hex(${kind}) values are not supported`,
    fileTooLarge: (source, megabytes) => `${source}: .reg files larger than ${megabytes} MB cannot be imported`,
    headerMissing: (source) => `${source}: no .reg header was found`,
    keyDeleteUnsupported: (source, line) => `${source}:${line}: deleting an entire registry key cannot be converted safely`,
    keyUnsupported: (source, line) => `${source}:${line}: the registry key is not supported`,
    valueBeforeKey: (source, line) => `${source}:${line}: a registry value appears before its key`,
    valueSyntaxInvalid: (source, line) => `${source}:${line}: the registry value syntax is invalid`,
    duplicateTarget: (source, line) => `${source}:${line}: the later duplicate target takes precedence`,
    noValues: (source) => `${source}: no importable registry values were found`,
  },
};
