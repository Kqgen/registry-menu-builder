import { createTweakId } from "./defaults.ts";
import type { RegistryProject, RegistryTweak } from "./types.ts";
import type { ImportedRegistryValue } from "../import/regFile.ts";
import { BUILDER_COPY } from "../i18n/builderCopy.ts";
import type { AppLocale } from "../i18n/locale.ts";

function targetKey(value: Pick<RegistryTweak, "hive" | "keyPath" | "valueName">): string {
  return `${value.hive}\\${value.keyPath}\\${value.valueName}`.toLocaleLowerCase("en-US");
}

function newTweak(value: ImportedRegistryValue, locale: AppLocale): RegistryTweak {
  const copy = BUILDER_COPY[locale];
  const group = value.keyPath.split("\\").at(-1) || "Registry";
  const source = value.sourceName.replace(/[\u0000-\u001f\u007f-\u009f]/gu, "").slice(0, 72);
  return {
    id: createTweakId(),
    label: (value.valueName || copy.defaultValue).slice(0, 60),
    group: group.slice(0, 40),
    description: copy.importedDescription(source).slice(0, 120),
    hive: value.hive,
    keyPath: value.keyPath,
    valueName: value.valueName,
    operation: value.operation,
    valueType: value.valueType,
    data: value.data,
    risk: "medium",
  };
}

export function mergeImportedValues(
  project: RegistryProject,
  values: readonly ImportedRegistryValue[],
  locale: AppLocale = "ja",
): RegistryProject {
  const tweaks = [...project.tweaks];
  const indexes = new Map(tweaks.map((tweak, index) => [targetKey(tweak), index]));
  for (const value of values) {
    const key = targetKey(value);
    const index = indexes.get(key);
    if (index === undefined) {
      indexes.set(key, tweaks.length);
      tweaks.push(newTweak(value, locale));
      continue;
    }
    const current = tweaks[index];
    if (current !== undefined) {
      tweaks[index] = {
        ...current,
        operation: value.operation,
        valueType: value.valueType,
        data: value.data,
      };
    }
  }
  return { ...project, tweaks };
}
