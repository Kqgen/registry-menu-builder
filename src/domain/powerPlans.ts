export const POWER_PLAN_PRESETS = [
  { id: "balanced", guid: "381b4222-f694-41f0-9685-ff5bb260df2e" },
  { id: "high-performance", guid: "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c" },
  { id: "power-saver", guid: "a1841308-3541-4fab-bc81-f71556f20b4a" },
] as const;

export type PowerPlanPresetId = (typeof POWER_PLAN_PRESETS)[number]["id"];

export function findPowerPlanPreset(guid: string): PowerPlanPresetId | undefined {
  return POWER_PLAN_PRESETS.find((preset) => preset.guid.toLowerCase() === guid.toLowerCase())?.id;
}
