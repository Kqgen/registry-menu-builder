import { createDefaultProject } from "../domain/defaults.ts";
import type { RegistryProject } from "../domain/types.ts";
import { parseProjectJson, validateProject } from "../domain/validation.ts";
import type { AppLocale } from "../i18n/locale.ts";

const STORAGE_KEY = "gaming-tweak-forge.project.v1";
const LEGACY_STORAGE_KEY = "registry-menu-builder.project.v1";

export function loadProject(locale: AppLocale = "ja"): RegistryProject {
  const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
  if (stored === null) {
    return createDefaultProject(locale);
  }
  const result = parseProjectJson(stored, locale);
  return result.ok ? result.project : createDefaultProject(locale);
}

export function saveProject(project: RegistryProject): void {
  if (validateProject(project).length === 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
}
