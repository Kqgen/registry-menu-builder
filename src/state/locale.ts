import { resolveAppLocale, type AppLocale } from "../i18n/locale.ts";

const STORAGE_KEY = "gaming-tweak-forge.locale.v1";

export function loadLocale(browserLanguage = navigator.language): AppLocale {
  return resolveAppLocale(localStorage.getItem(STORAGE_KEY), browserLanguage);
}

export function saveLocale(locale: AppLocale): void {
  localStorage.setItem(STORAGE_KEY, locale);
}
