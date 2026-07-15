import { createEmptyTweak } from "../domain/defaults.ts";
import {
  HIVES,
  OPERATIONS,
  RISK_LEVELS,
  VALUE_TYPES,
  type RegistryOperation,
  type RegistryTweak,
  type RegistryValueType,
} from "../domain/types.ts";
import { option, requireElement } from "./dom.ts";

const OPERATION_LABELS: Readonly<Record<RegistryOperation, string>> = {
  set: "値を設定",
  delete: "値を削除",
};

const TYPE_HINTS: Readonly<Record<RegistryValueType, string>> = {
  REG_SZ: "文字列をそのまま保存",
  REG_EXPAND_SZ: "%PATH% などを展開せず保存",
  REG_MULTI_SZ: "1行につき1要素",
  REG_BINARY: "例: 01 ff a0 または 01,ff,a0",
  REG_DWORD: "0〜4294967295、または0x形式",
  REG_QWORD: "0〜18446744073709551615、または0x形式",
};

const RISK_LABELS = {
  low: "低",
  medium: "中",
  high: "高",
} as const;

const form = () => requireElement("#tweak-form", HTMLFormElement);
const input = (selector: string) => requireElement(selector, HTMLInputElement);
const select = (selector: string) => requireElement(selector, HTMLSelectElement);
const textarea = (selector: string) => requireElement(selector, HTMLTextAreaElement);

export function initializeTweakForm(): void {
  const hive = select("#tweak-hive");
  HIVES.forEach((value) => hive.append(option(value, value)));
  const operation = select("#tweak-operation");
  OPERATIONS.forEach((value) => operation.append(option(value, OPERATION_LABELS[value])));
  const type = select("#tweak-value-type");
  VALUE_TYPES.forEach((value) => type.append(option(value, value)));
  const risk = select("#tweak-risk");
  RISK_LEVELS.forEach((value) => risk.append(option(value, RISK_LABELS[value])));
  operation.addEventListener("change", updateValueControls);
  type.addEventListener("change", updateDataHint);
  clearTweakForm();
}

export function readTweakForm(): RegistryTweak {
  return {
    id: input("#tweak-id").value,
    label: input("#tweak-label").value,
    group: input("#tweak-group").value,
    description: input("#tweak-description").value,
    hive: select("#tweak-hive").value as RegistryTweak["hive"],
    keyPath: input("#tweak-key-path").value,
    valueName: input("#tweak-value-name").value,
    operation: select("#tweak-operation").value as RegistryTweak["operation"],
    valueType: select("#tweak-value-type").value as RegistryTweak["valueType"],
    data: textarea("#tweak-data").value,
    risk: select("#tweak-risk").value as RegistryTweak["risk"],
  };
}

export function fillTweakForm(tweak: RegistryTweak): void {
  input("#tweak-id").value = tweak.id;
  input("#tweak-label").value = tweak.label;
  input("#tweak-group").value = tweak.group;
  input("#tweak-description").value = tweak.description;
  select("#tweak-hive").value = tweak.hive;
  input("#tweak-key-path").value = tweak.keyPath;
  input("#tweak-value-name").value = tweak.valueName;
  select("#tweak-operation").value = tweak.operation;
  select("#tweak-value-type").value = tweak.valueType;
  textarea("#tweak-data").value = tweak.data;
  select("#tweak-risk").value = tweak.risk;
  updateValueControls();
  updateDataHint();
  requireElement("#save-tweak-button", HTMLButtonElement).lastElementChild!.textContent = "Tweakを更新";
  requireElement("#cancel-edit-button", HTMLButtonElement).hidden = false;
  form().scrollIntoView({ behavior: "smooth", block: "center" });
}

export function clearTweakForm(): void {
  fillTweakFormValues(createEmptyTweak());
  requireElement("#save-tweak-button", HTMLButtonElement).lastElementChild!.textContent = "Tweakを追加";
  requireElement("#cancel-edit-button", HTMLButtonElement).hidden = true;
  hideFormErrors();
}

function fillTweakFormValues(tweak: RegistryTweak): void {
  input("#tweak-id").value = tweak.id;
  input("#tweak-label").value = tweak.label;
  input("#tweak-group").value = tweak.group;
  input("#tweak-description").value = tweak.description;
  select("#tweak-hive").value = tweak.hive;
  input("#tweak-key-path").value = tweak.keyPath;
  input("#tweak-value-name").value = tweak.valueName;
  select("#tweak-operation").value = tweak.operation;
  select("#tweak-value-type").value = tweak.valueType;
  textarea("#tweak-data").value = tweak.data;
  select("#tweak-risk").value = tweak.risk;
  updateValueControls();
  updateDataHint();
}

function updateValueControls(): void {
  const isDelete = select("#tweak-operation").value === "delete";
  document.querySelectorAll<HTMLElement>("[data-value-control]").forEach((element) => {
    element.dataset["disabled"] = String(isDelete);
  });
  select("#tweak-value-type").disabled = isDelete;
  textarea("#tweak-data").disabled = isDelete;
}

function updateDataHint(): void {
  const type = select("#tweak-value-type").value as RegistryValueType;
  requireElement("#data-hint", HTMLElement).textContent = TYPE_HINTS[type];
}

export function showFormErrors(messages: readonly string[]): void {
  const container = requireElement("#form-errors", HTMLDivElement);
  container.replaceChildren();
  const list = document.createElement("ul");
  messages.forEach((message) => {
    const item = document.createElement("li");
    item.textContent = message;
    list.append(item);
  });
  container.append(list);
  container.hidden = false;
}

export function hideFormErrors(): void {
  const container = requireElement("#form-errors", HTMLDivElement);
  container.hidden = true;
  container.replaceChildren();
}
