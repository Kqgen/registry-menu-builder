export const HIVES = ["HKCU", "HKLM", "HKCR", "HKU", "HKCC"] as const;
export const OPERATIONS = ["set", "delete"] as const;
export const VALUE_TYPES = [
  "REG_SZ",
  "REG_EXPAND_SZ",
  "REG_MULTI_SZ",
  "REG_BINARY",
  "REG_DWORD",
  "REG_QWORD",
] as const;
export const RISK_LEVELS = ["low", "medium", "high"] as const;
export const THEME_IDS = ["amber", "ice", "matrix", "paper"] as const;
export const BANNER_STYLE_IDS = ["apex", "drift", "ghost", "umbra", "ember"] as const;
export const SYSTEM_ACTION_KINDS = ["power-plan"] as const;
export const MAX_PROJECT_ITEMS = 1024;
export const MAX_TWEAKS = MAX_PROJECT_ITEMS;
export const MAX_PROJECT_JSON_BYTES = 16 * 1_048_576;

export type RegistryHive = (typeof HIVES)[number];
export type RegistryOperation = (typeof OPERATIONS)[number];
export type RegistryValueType = (typeof VALUE_TYPES)[number];
export type RiskLevel = (typeof RISK_LEVELS)[number];
export type ThemeId = (typeof THEME_IDS)[number];
export type BannerStyleId = (typeof BANNER_STYLE_IDS)[number];
export type SystemActionKind = (typeof SYSTEM_ACTION_KINDS)[number];

export interface RegistryTweak {
  readonly id: string;
  readonly label: string;
  readonly group: string;
  readonly description: string;
  readonly hive: RegistryHive;
  readonly keyPath: string;
  readonly valueName: string;
  readonly operation: RegistryOperation;
  readonly valueType: RegistryValueType;
  readonly data: string;
  readonly risk: RiskLevel;
}

export interface PowerPlanAction {
  readonly kind: "power-plan";
  readonly id: string;
  readonly label: string;
  readonly group: string;
  readonly description: string;
  readonly schemeGuid: string;
  readonly risk: RiskLevel;
}

export type SystemAction = PowerPlanAction;

export interface RegistryProject {
  readonly version: 2;
  readonly projectId: string;
  readonly title: string;
  readonly bannerText: string;
  readonly bannerStyle: BannerStyleId;
  readonly subtitle: string;
  readonly theme: ThemeId;
  readonly tweaks: readonly RegistryTweak[];
  readonly actions: readonly SystemAction[];
}

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export type ParsedRegistryData =
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "multi"; readonly value: readonly string[] }
  | { readonly kind: "binary"; readonly value: readonly number[] }
  | { readonly kind: "integer"; readonly value: bigint };
