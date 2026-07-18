import type { RegistryTweak } from "../domain/types.ts";
import type { BatchLocaleCopy } from "./batchLocale.ts";
import { padConsoleText, panelLine, sectionRule, strongRule } from "./consoleLayout.ts";

export const PAGE_SIZE = 8;

const FIELD_LABEL_WIDTH = 14;

export function escapeBatchText(value: string): string {
  let quoted = false;
  let escaped = "";
  for (const character of value) {
    if (character === '"') {
      quoted = !quoted;
      escaped += character;
    } else if (character === "%") {
      escaped += "%%";
    } else if (!quoted && character === "^") {
      escaped += "^^";
    } else if (!quoted && "&|<>()".includes(character)) {
      escaped += `^${character}`;
    } else {
      escaped += character;
    }
  }
  return escaped;
}

export function labelIndex(index: number): string {
  return (index + 1).toString().padStart(3, "0");
}

export function pageLabel(index: number): string {
  return `menu_${labelIndex(index)}`;
}

export function echo(value = ""): string {
  return `echo(${value}`;
}

export function panelEcho(value: string, width: number): string {
  return echo(escapeBatchText(panelLine(value, width)));
}

export function ruleEcho(label: string, width: number): string {
  return echo(escapeBatchText(sectionRule(label, width)));
}

export function strongRuleEcho(width: number): string {
  return echo(strongRule(width));
}

export function fieldText(label: string, value: string): string {
  return `  ${padConsoleText(label, FIELD_LABEL_WIDTH)}${value}`;
}

export function actionText(key: string, value: string): string {
  return `  [${key}]  ${value}`;
}

export function displayData(tweak: RegistryTweak, copy: BatchLocaleCopy): string {
  if (tweak.operation === "delete") {
    return copy.messages.deleteValue;
  }
  return tweak.data.replaceAll("\r", "").replaceAll("\n", "\\n");
}

export interface ChoiceRoute {
  readonly key: string;
  readonly label: string;
}

export function choiceDispatch(routes: readonly ChoiceRoute[], prompt: string): readonly string[] {
  const keys = routes.map((route) => route.key).join("");
  const lines = [`"%TF_CHOICE%" /c ${keys} /n /m "${prompt}"`];
  for (let index = routes.length - 1; index >= 0; index -= 1) {
    const route = routes[index];
    if (route !== undefined) {
      lines.push(`if errorlevel ${index + 1} goto ${route.label}`);
    }
  }
  return lines;
}
