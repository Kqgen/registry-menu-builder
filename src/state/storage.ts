import { createDefaultProject } from "../domain/defaults.ts";
import type { RegistryProject } from "../domain/types.ts";
import { parseProjectJson, validateProject } from "../domain/validation.ts";

const STORAGE_KEY = "gaming-tweak-forge.project.v1";
const LEGACY_STORAGE_KEY = "registry-menu-builder.project.v1";

export function loadProject(): RegistryProject {
  const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
  if (stored === null) {
    return createDefaultProject();
  }
  const result = parseProjectJson(stored);
  return result.ok ? result.project : createDefaultProject();
}

export function saveProject(project: RegistryProject): void {
  if (validateProject(project).length === 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
}
