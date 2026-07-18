import type { PowerPlanAction, RegistryProject, RegistryTweak, RiskLevel } from "../domain/types.ts";

interface BatchItemBase {
  readonly id: string;
  readonly label: string;
  readonly group: string;
  readonly description: string;
  readonly risk: RiskLevel;
}

export type BatchItem =
  | BatchItemBase & { readonly kind: "registry"; readonly tweak: RegistryTweak }
  | BatchItemBase & { readonly kind: "power-plan"; readonly action: PowerPlanAction };

export function getBatchItems(project: RegistryProject): readonly BatchItem[] {
  return [
    ...project.tweaks.map((tweak): BatchItem => ({
      kind: "registry",
      id: tweak.id,
      label: tweak.label,
      group: tweak.group,
      description: tweak.description,
      risk: tweak.risk,
      tweak,
    })),
    ...project.actions.map((action): BatchItem => ({
      kind: "power-plan",
      id: action.id,
      label: action.label,
      group: action.group,
      description: action.description,
      risk: action.risk,
      action,
    })),
  ];
}
