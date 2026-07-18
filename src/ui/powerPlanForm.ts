import { createEmptyPowerPlanAction } from "../domain/defaults.ts";
import { findPowerPlanPreset, POWER_PLAN_PRESETS } from "../domain/powerPlans.ts";
import { RISK_LEVELS, type PowerPlanAction } from "../domain/types.ts";
import { BUILDER_COPY, type BuilderCopy } from "../i18n/builderCopy.ts";
import type { AppLocale } from "../i18n/locale.ts";
import { option, requireElement } from "./dom.ts";

let activeCopy = BUILDER_COPY.ja;
let activeLocale: AppLocale = "ja";

const input = (selector: string) => requireElement(selector, HTMLInputElement);
const select = (selector: string) => requireElement(selector, HTMLSelectElement);

function updateCustomGuidVisibility(): void {
  const custom = select("#power-plan-preset").value === "custom";
  requireElement("#power-plan-custom-field", HTMLLabelElement).hidden = !custom;
  input("#power-plan-guid").required = custom;
}

function fillValues(action: PowerPlanAction): void {
  input("#power-plan-id").value = action.id;
  input("#power-plan-label").value = action.label;
  input("#power-plan-group").value = action.group;
  input("#power-plan-description").value = action.description;
  select("#power-plan-risk").value = action.risk;
  const preset = findPowerPlanPreset(action.schemeGuid);
  select("#power-plan-preset").value = preset === undefined ? "custom" : action.schemeGuid.toLowerCase();
  input("#power-plan-guid").value = preset === undefined ? action.schemeGuid : "";
  updateCustomGuidVisibility();
}

export function initializePowerPlanForm(copy: BuilderCopy, locale: AppLocale): void {
  activeCopy = copy;
  activeLocale = locale;
  const preset = select("#power-plan-preset");
  POWER_PLAN_PRESETS.forEach(({ id, guid }) => preset.append(option(guid, activeCopy.powerPlanPresets[id])));
  preset.append(option("custom", activeCopy.customPowerPlan));
  const risk = select("#power-plan-risk");
  RISK_LEVELS.forEach((value) => risk.append(option(value, activeCopy.formRisks[value])));
  preset.addEventListener("change", updateCustomGuidVisibility);
  clearPowerPlanForm();
}

export function setPowerPlanFormLocale(copy: BuilderCopy, locale: AppLocale): void {
  const editing = !requireElement("#cancel-power-plan-button", HTMLButtonElement).hidden;
  const previousDefault = createEmptyPowerPlanAction(activeLocale);
  const current = readPowerPlanForm();
  const localizableDefault = !editing
    && current.label === previousDefault.label
    && current.group === previousDefault.group
    && current.description === previousDefault.description
    && current.schemeGuid === previousDefault.schemeGuid
    && current.risk === previousDefault.risk;
  activeCopy = copy;
  activeLocale = locale;
  POWER_PLAN_PRESETS.forEach(({ id, guid }) => {
    const entry = select("#power-plan-preset").querySelector<HTMLOptionElement>(`option[value="${guid}"]`);
    if (entry !== null) {
      entry.textContent = activeCopy.powerPlanPresets[id];
    }
  });
  const custom = select("#power-plan-preset").querySelector<HTMLOptionElement>('option[value="custom"]');
  if (custom !== null) {
    custom.textContent = activeCopy.customPowerPlan;
  }
  RISK_LEVELS.forEach((value) => {
    const entry = select("#power-plan-risk").querySelector<HTMLOptionElement>(`option[value="${value}"]`);
    if (entry !== null) {
      entry.textContent = activeCopy.formRisks[value];
    }
  });
  if (localizableDefault) {
    fillValues(createEmptyPowerPlanAction(activeLocale));
  }
  requireElement("#save-power-plan-button", HTMLButtonElement).lastElementChild!.textContent = editing
    ? activeCopy.updatePowerPlan
    : activeCopy.addPowerPlan;
}

export function readPowerPlanForm(): PowerPlanAction {
  const selected = select("#power-plan-preset").value;
  const schemeGuid = selected === "custom"
    ? input("#power-plan-guid").value.trim()
    : selected;
  return {
    kind: "power-plan",
    id: input("#power-plan-id").value,
    label: input("#power-plan-label").value,
    group: input("#power-plan-group").value,
    description: input("#power-plan-description").value,
    schemeGuid,
    risk: select("#power-plan-risk").value as PowerPlanAction["risk"],
  };
}

export function fillPowerPlanForm(action: PowerPlanAction): void {
  fillValues(action);
  requireElement("#save-power-plan-button", HTMLButtonElement).lastElementChild!.textContent = activeCopy.updatePowerPlan;
  requireElement("#cancel-power-plan-button", HTMLButtonElement).hidden = false;
  requireElement("#power-plan-form", HTMLFormElement).scrollIntoView({ behavior: "smooth", block: "center" });
}

export function clearPowerPlanForm(): void {
  fillValues(createEmptyPowerPlanAction(activeLocale));
  requireElement("#save-power-plan-button", HTMLButtonElement).lastElementChild!.textContent = activeCopy.addPowerPlan;
  requireElement("#cancel-power-plan-button", HTMLButtonElement).hidden = true;
  hidePowerPlanErrors();
}

export function showPowerPlanErrors(messages: readonly string[]): void {
  const container = requireElement("#power-plan-errors", HTMLDivElement);
  const list = document.createElement("ul");
  messages.forEach((message) => {
    const item = document.createElement("li");
    item.textContent = message;
    list.append(item);
  });
  container.replaceChildren(list);
  container.hidden = false;
}

export function hidePowerPlanErrors(): void {
  const container = requireElement("#power-plan-errors", HTMLDivElement);
  container.hidden = true;
  container.replaceChildren();
}
