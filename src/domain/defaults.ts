import type { PowerPlanAction, RegistryProject, RegistryTweak } from "./types.ts";
import type { AppLocale } from "../i18n/locale.ts";

export const DEFAULT_TWEAK: RegistryTweak = {
  id: "show_file_extensions",
  label: "ファイル拡張子を表示",
  group: "Explorer",
  description: "既知のファイル種類でも拡張子を表示します",
  hive: "HKCU",
  keyPath: "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
  valueName: "HideFileExt",
  operation: "set",
  valueType: "REG_DWORD",
  data: "0",
  risk: "low",
};

export const DEFAULT_PROJECT: RegistryProject = {
  version: 2,
  projectId: "project_demo",
  title: "My Gaming Tweaks",
  bannerText: "GAME TWEAK",
  bannerStyle: "umbra",
  subtitle: "Tune locally. Back up first. Restore when state is available.",
  theme: "amber",
  tweaks: [DEFAULT_TWEAK],
  actions: [],
};

const DEFAULT_TWEAK_TEXT: Readonly<Record<AppLocale, Pick<RegistryTweak, "label" | "description">>> = {
  ja: {
    label: "ファイル拡張子を表示",
    description: "既知のファイル種類でも拡張子を表示します",
  },
  en: {
    label: "Show file extensions",
    description: "Show extensions even for known file types",
  },
};

function createInternalId(prefix: "item" | "project"): string {
  const token = globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  return `${prefix}_${token}`;
}

export function createTweakId(): string {
  return createInternalId("item");
}

export function createDefaultProject(locale: AppLocale = "ja"): RegistryProject {
  return {
    ...DEFAULT_PROJECT,
    projectId: createInternalId("project"),
    tweaks: [{ ...DEFAULT_TWEAK, ...DEFAULT_TWEAK_TEXT[locale], id: createTweakId() }],
  };
}

export function createEmptyTweak(): RegistryTweak {
  return {
    id: createTweakId(),
    label: "",
    group: "General",
    description: "",
    hive: "HKCU",
    keyPath: "Software",
    valueName: "",
    operation: "set",
    valueType: "REG_DWORD",
    data: "0",
    risk: "medium",
  };
}

export function createEmptyPowerPlanAction(locale: AppLocale = "ja"): PowerPlanAction {
  return {
    kind: "power-plan",
    id: createTweakId(),
    label: locale === "ja" ? "高パフォーマンス電源プラン" : "High performance power plan",
    group: locale === "ja" ? "電源" : "Power",
    description: locale === "ja"
      ? "既存の高パフォーマンス電源プランへ切り替えます"
      : "Switch to the existing High performance power plan",
    schemeGuid: "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c",
    risk: "medium",
  };
}
