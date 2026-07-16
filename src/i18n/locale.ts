export const APP_LOCALES = ["ja", "en"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && APP_LOCALES.includes(value as AppLocale);
}

export function resolveAppLocale(stored: unknown, browserLanguage: string): AppLocale {
  if (isAppLocale(stored)) {
    return stored;
  }
  return browserLanguage.toLocaleLowerCase("en-US").startsWith("ja") ? "ja" : "en";
}
