import type { RegistryOperation, RegistryValueType, RiskLevel } from "../domain/types.ts";
import type { AppLocale } from "./locale.ts";

const JA_TEXT = {
  languageLabel: "表示言語",
  brandHome: "Gaming Tweak Forge ホーム",
  regImport: "REGを一括取込",
  jsonImport: "JSONを読込",
  jsonExport: "JSONを保存",
  batSave: "Tweak BATを保存",
  introEyebrow: "ローカル・ゲーミングTweakワークベンチ",
  introTitleFirst: "Tweakを入れる。",
  introTitleSecond: "自分のツールになる。",
  introDescription: "レジストリ値を手入力するか、複数設定を含むREGファイルをまとめて取り込みます。生成BATは適用前の値を退避し、状態ファイルが残っている値をTweak単位または一括で復元できます。",
  ready: "準備完了",
  identityStep: "01 / ツール設定",
  identityHeading: "ツールのルック",
  identityNote: "タイトル・ASCIIロゴ・コンソールカラー",
  toolName: "Tweakツール名",
  bannerText: "ASCIIロゴ文字",
  bannerTextHint: "A–Z / 0–9 / 空白 / ハイフン",
  bannerStyle: "ASCIIスタイル",
  bannerApex: "APEX SLAB / 半ブロック",
  bannerDrift: "DRIFT EDGE / 前傾スキャン",
  bannerGhost: "GHOST VECTOR / 発光ノード",
  bannerUmbra: "UMBRA DROP / 影落とし",
  bannerEmber: "EMBER DECAY / 崩壊シェード",
  subtitle: "サブタイトル",
  asciiPreviewAria: "ASCIIロゴのプレビュー",
  asciiLive: "ASCIIライブプレビュー",
  consoleTheme: "コンソールテーマ",
  setupStep: "02 / TWEAK設定",
  setupHeading: "Gaming Tweakを追加",
  cancelEdit: "編集を取消",
  tweakName: "Tweak名",
  tweakGroup: "Tweakグループ",
  effect: "効果・目的",
  hive: "ハイブ",
  keyPath: "キーパス",
  valueName: "値の名前",
  valueNameHint: "空欄はキーの既定値として扱います",
  operation: "Tweak操作",
  valueType: "値の種類",
  tweakData: "Tweakデータ",
  risk: "注意度",
  addTweak: "Tweakを追加",
  loadoutStep: "03 / TWEAK一覧",
  loadoutHeading: "Gaming Tweak一覧",
  previewLive: "TWEAK BATライブプレビュー",
  copy: "コピー",
  safetyTitle: "適用直前の値を初回だけ保存。",
  safetyPrefix: "バックアップはBATと同じ場所の ",
  safetySuffix: " に保持され、利用可能なTweakだけを元へ戻します。",
  metaDescription: "ゲーム向けレジストリTweakをASCIIメニュー付きWindowsバッチへまとめるローカルアプリ",
} as const;

export type BuilderTextKey = keyof typeof JA_TEXT;

const EN_TEXT: Readonly<Record<BuilderTextKey, string>> = {
  languageLabel: "Language",
  brandHome: "Gaming Tweak Forge home",
  regImport: "Import REG files",
  jsonImport: "Load JSON",
  jsonExport: "Save JSON",
  batSave: "Save Tweak BAT",
  introEyebrow: "LOCAL GAMING TWEAK WORKBENCH",
  introTitleFirst: "Add your tweaks.",
  introTitleSecond: "Make the tool yours.",
  introDescription: "Enter registry values manually or import multiple REG files at once. The generated BAT backs up values before applying them and can restore available saved values individually or in bulk.",
  ready: "Ready",
  identityStep: "01 / TWEAK IDENTITY",
  identityHeading: "Shape the tool",
  identityNote: "Title, ASCII logo, and console colors",
  toolName: "Tweak tool name",
  bannerText: "ASCII logo text",
  bannerTextHint: "A–Z / 0–9 / spaces / hyphens",
  bannerStyle: "ASCII style",
  bannerApex: "APEX SLAB / Half blocks",
  bannerDrift: "DRIFT EDGE / Forward scan",
  bannerGhost: "GHOST VECTOR / Glow nodes",
  bannerUmbra: "UMBRA DROP / Drop shadow",
  bannerEmber: "EMBER DECAY / Fading shade",
  subtitle: "Subtitle",
  asciiPreviewAria: "ASCII logo preview",
  asciiLive: "LIVE ASCII PREVIEW",
  consoleTheme: "Console theme",
  setupStep: "02 / TWEAK SETUP",
  setupHeading: "Add a gaming tweak",
  cancelEdit: "Cancel edit",
  tweakName: "Tweak name",
  tweakGroup: "Tweak group",
  effect: "Effect and purpose",
  hive: "Hive",
  keyPath: "Key path",
  valueName: "Value name",
  valueNameHint: "Leave blank to target the key's default value",
  operation: "Tweak operation",
  valueType: "Value type",
  tweakData: "Tweak data",
  risk: "Risk level",
  addTweak: "Add tweak",
  loadoutStep: "03 / TWEAK LOADOUT",
  loadoutHeading: "Gaming tweak list",
  previewLive: "LIVE TWEAK BAT PREVIEW",
  copy: "Copy",
  safetyTitle: "Back up each value once, immediately before applying it. ",
  safetyPrefix: "Backups stay in ",
  safetySuffix: " beside the BAT, and only tweaks with available state can be restored.",
  metaDescription: "A local app for assembling gaming registry tweaks into a Windows batch file with an ASCII menu",
};

export interface BuilderCopy {
  readonly text: Readonly<Record<BuilderTextKey, string>>;
  readonly operations: Readonly<Record<RegistryOperation, string>>;
  readonly typeHints: Readonly<Record<RegistryValueType, string>>;
  readonly formRisks: Readonly<Record<RiskLevel, string>>;
  readonly cardRisks: Readonly<Record<RiskLevel, string>>;
  readonly defaultValue: string;
  readonly edit: string;
  readonly delete: string;
  readonly addTweak: string;
  readonly updateTweak: string;
  readonly summary: (count: number) => string;
  readonly asciiInvalid: string;
  readonly checkInputs: (count: number) => string;
  readonly canGenerate: string;
  readonly cannotGenerate: string;
  readonly generationError: string;
  readonly tweakUpdated: string;
  readonly tweakAdded: string;
  readonly tweakDeleted: string;
  readonly tooManyRegFiles: (limit: number) => string;
  readonly regTotalTooLarge: (megabytes: number) => string;
  readonly regCannotAdd: string;
  readonly regImported: (files: number, values: number, warnings: number) => string;
  readonly regImportFailed: string;
  readonly jsonTooLarge: (megabytes: number) => string;
  readonly jsonInvalid: string;
  readonly projectLoaded: string;
  readonly fixBeforeSave: string;
  readonly projectSaved: string;
  readonly projectSaveFailed: string;
  readonly batSaved: string;
  readonly batSaveFailed: string;
  readonly noBatToCopy: string;
  readonly batCopied: string;
  readonly clipboardFailed: string;
  readonly languageChanged: string;
  readonly importedDescription: (source: string) => string;
}

export const BUILDER_COPY: Readonly<Record<AppLocale, BuilderCopy>> = {
  ja: {
    text: JA_TEXT,
    operations: { set: "値を設定", delete: "値を削除" },
    typeHints: {
      REG_SZ: "文字列をそのまま保存",
      REG_EXPAND_SZ: "%PATH% などを展開せず保存",
      REG_MULTI_SZ: "1行につき1要素",
      REG_BINARY: "例: 01 ff a0 または 01,ff,a0",
      REG_DWORD: "0〜4294967295、または0x形式",
      REG_QWORD: "0〜18446744073709551615、または0x形式",
    },
    formRisks: { low: "低", medium: "中", high: "高" },
    cardRisks: { low: "低", medium: "中", high: "高" },
    defaultValue: "(既定)",
    edit: "編集",
    delete: "削除",
    addTweak: "Tweakを追加",
    updateTweak: "Tweakを更新",
    summary: (count) => `${count}件のGaming Tweak / ローカルプロジェクト`,
    asciiInvalid: "ASCIIロゴに使えない文字があります",
    checkInputs: (count) => `${count}件の入力を確認してください`,
    canGenerate: "Tweak BATを生成できます",
    cannotGenerate: "Tweak BATを生成できません",
    generationError: "生成中にエラーが発生しました",
    tweakUpdated: "Gaming Tweakを更新しました",
    tweakAdded: "Gaming Tweakを追加しました",
    tweakDeleted: "Gaming Tweakを削除しました",
    tooManyRegFiles: (limit) => `一度に取り込めるREGファイルは${limit}個までです`,
    regTotalTooLarge: (megabytes) => `一度に取り込めるREGファイルは合計${megabytes}MBまでです`,
    regCannotAdd: "REGファイルの内容を追加できません",
    regImported: (files, values, warnings) => `${files}ファイルから${values}件のTweakを取り込みました${warnings > 0 ? ` / 警告${warnings}件` : ""}`,
    regImportFailed: "REGファイルを読み込めませんでした",
    jsonTooLarge: (megabytes) => `JSONは${megabytes}MB以下にしてください`,
    jsonInvalid: "JSONを読み込めませんでした",
    projectLoaded: "Tweakプロジェクトを読み込みました",
    fixBeforeSave: "入力エラーを直してから保存してください",
    projectSaved: "Tweakプロジェクトを保存しました",
    projectSaveFailed: "Tweakプロジェクトを保存できませんでした",
    batSaved: "Gaming Tweak BATを保存しました",
    batSaveFailed: "Gaming Tweak BATを保存できませんでした",
    noBatToCopy: "コピーできるTweak BATがありません",
    batCopied: "Gaming Tweak BATをコピーしました",
    clipboardFailed: "クリップボードへコピーできませんでした",
    languageChanged: "ビルダーの表示を日本語に切り替えました",
    importedDescription: (source) => `${source} からインポート`,
  },
  en: {
    text: EN_TEXT,
    operations: { set: "Set value", delete: "Delete value" },
    typeHints: {
      REG_SZ: "Store the text as entered",
      REG_EXPAND_SZ: "Store variables such as %PATH% without expanding them",
      REG_MULTI_SZ: "One item per line",
      REG_BINARY: "Example: 01 ff a0 or 01,ff,a0",
      REG_DWORD: "0–4294967295, or hexadecimal beginning with 0x",
      REG_QWORD: "0–18446744073709551615, or hexadecimal beginning with 0x",
    },
    formRisks: { low: "Low", medium: "Medium", high: "High" },
    cardRisks: { low: "LOW", medium: "MID", high: "HIGH" },
    defaultValue: "(Default)",
    edit: "Edit",
    delete: "Delete",
    addTweak: "Add tweak",
    updateTweak: "Update tweak",
    summary: (count) => `${count} gaming tweak${count === 1 ? "" : "s"} / local project`,
    asciiInvalid: "The ASCII logo contains unsupported characters",
    checkInputs: (count) => `Review ${count} input issue${count === 1 ? "" : "s"}`,
    canGenerate: "Tweak BAT is ready to generate",
    cannotGenerate: "Tweak BAT cannot be generated",
    generationError: "An error occurred while generating the BAT",
    tweakUpdated: "Gaming tweak updated",
    tweakAdded: "Gaming tweak added",
    tweakDeleted: "Gaming tweak deleted",
    tooManyRegFiles: (limit) => `You can import up to ${limit} REG files at once`,
    regTotalTooLarge: (megabytes) => `REG files can total up to ${megabytes} MB per import`,
    regCannotAdd: "The REG file contents cannot be added",
    regImported: (files, values, warnings) => `Imported ${values} tweak${values === 1 ? "" : "s"} from ${files} file${files === 1 ? "" : "s"}${warnings > 0 ? ` / ${warnings} warning${warnings === 1 ? "" : "s"}` : ""}`,
    regImportFailed: "The REG files could not be imported",
    jsonTooLarge: (megabytes) => `JSON files must be ${megabytes} MB or smaller`,
    jsonInvalid: "The JSON project could not be loaded",
    projectLoaded: "Tweak project loaded",
    fixBeforeSave: "Fix the input errors before saving",
    projectSaved: "Tweak project saved",
    projectSaveFailed: "The tweak project could not be saved",
    batSaved: "Gaming Tweak BAT saved",
    batSaveFailed: "The Gaming Tweak BAT could not be saved",
    noBatToCopy: "There is no valid Tweak BAT to copy",
    batCopied: "Gaming Tweak BAT copied",
    clipboardFailed: "The Tweak BAT could not be copied to the clipboard",
    languageChanged: "Builder language changed to English",
    importedDescription: (source) => `Imported from ${source}`,
  },
};
