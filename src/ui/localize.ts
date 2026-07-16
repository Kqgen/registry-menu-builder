import type { BuilderCopy, BuilderTextKey } from "../i18n/builderCopy.ts";
import type { AppLocale } from "../i18n/locale.ts";
import { requireElement } from "./dom.ts";

function copyText(copy: BuilderCopy, key: string | undefined): string {
  if (key === undefined || !Object.hasOwn(copy.text, key)) {
    throw new Error(`Unknown builder copy key: ${key ?? ""}`);
  }
  return copy.text[key as BuilderTextKey];
}

export function applyDocumentLocale(locale: AppLocale, copy: BuilderCopy): void {
  document.documentElement.lang = locale;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    element.textContent = copyText(copy, element.dataset["i18n"]);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", copyText(copy, element.dataset["i18nAriaLabel"]));
  });
  document.querySelectorAll<HTMLMetaElement>("[data-i18n-content]").forEach((element) => {
    element.content = copyText(copy, element.dataset["i18nContent"]);
  });
  requireElement("#builder-language", HTMLSelectElement).value = locale;
}
