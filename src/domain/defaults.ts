import type { RegistryProject, RegistryTweak } from "./types.ts";

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
  version: 1,
  projectId: "project_demo",
  title: "My Gaming Tweaks",
  bannerText: "GAME TWEAK",
  bannerStyle: "umbra",
  subtitle: "Tune locally. Back up first. Roll back anytime.",
  theme: "amber",
  tweaks: [DEFAULT_TWEAK],
};

function createInternalId(prefix: "item" | "project"): string {
  const token = globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  return `${prefix}_${token}`;
}

export function createTweakId(): string {
  return createInternalId("item");
}

export function createDefaultProject(): RegistryProject {
  return {
    ...DEFAULT_PROJECT,
    projectId: createInternalId("project"),
    tweaks: [{ ...DEFAULT_TWEAK, id: createTweakId() }],
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
