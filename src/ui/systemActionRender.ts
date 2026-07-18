import type { PowerPlanAction } from "../domain/types.ts";
import type { BuilderCopy } from "../i18n/builderCopy.ts";

function actionButton(action: "edit" | "delete", actionId: string, label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-button ${action}`;
  button.dataset["action"] = action;
  button.dataset["systemActionId"] = actionId;
  button.textContent = label;
  return button;
}

function powerPlanCard(action: PowerPlanAction, index: number, copy: BuilderCopy): HTMLElement {
  const card = document.createElement("article");
  card.className = "tweak-card system-action-card";
  card.dataset["risk"] = action.risk;
  const indexElement = document.createElement("span");
  indexElement.className = "tweak-index";
  indexElement.textContent = String(index + 1).padStart(2, "0");
  const content = document.createElement("div");
  content.className = "tweak-content";
  const meta = document.createElement("div");
  meta.className = "tweak-meta";
  const kind = document.createElement("span");
  kind.className = "kind-pill";
  kind.textContent = copy.powerPlanKind;
  const group = document.createElement("span");
  group.textContent = action.group;
  const risk = document.createElement("span");
  risk.className = "risk-pill";
  risk.textContent = copy.cardRisks[action.risk];
  meta.append(kind, group, risk);
  const title = document.createElement("strong");
  title.textContent = action.label;
  const target = document.createElement("code");
  target.textContent = `powercfg.exe /setactive ${action.schemeGuid}`;
  content.append(meta, title, target);
  const actions = document.createElement("div");
  actions.className = "tweak-actions";
  actions.append(
    actionButton("edit", action.id, copy.edit),
    actionButton("delete", action.id, copy.delete),
  );
  card.append(indexElement, content, actions);
  return card;
}

export function renderSystemActionList(
  container: HTMLElement,
  actions: readonly PowerPlanAction[],
  copy: BuilderCopy,
): void {
  container.replaceChildren();
  actions.forEach((action, index) => container.append(powerPlanCard(action, index, copy)));
}
