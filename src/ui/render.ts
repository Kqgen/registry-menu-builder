import { THEMES, type ConsoleTheme } from "../domain/themes.ts";
import type { RegistryProject, RegistryTweak, ThemeId } from "../domain/types.ts";
import type { StyledBanner } from "../generator/ascii.ts";

const RISK_LABELS = {
  low: "LOW",
  medium: "MID",
  high: "HIGH",
} as const;

function actionButton(action: "edit" | "delete", tweakId: string, label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-button ${action}`;
  button.dataset["action"] = action;
  button.dataset["tweakId"] = tweakId;
  button.textContent = label;
  return button;
}

function tweakCard(tweak: RegistryTweak, index: number): HTMLElement {
  const card = document.createElement("article");
  card.className = "tweak-card";
  card.dataset["risk"] = tweak.risk;

  const indexElement = document.createElement("span");
  indexElement.className = "tweak-index";
  indexElement.textContent = String(index + 1).padStart(2, "0");

  const content = document.createElement("div");
  content.className = "tweak-content";
  const meta = document.createElement("div");
  meta.className = "tweak-meta";
  const group = document.createElement("span");
  group.textContent = tweak.group;
  const risk = document.createElement("span");
  risk.className = "risk-pill";
  risk.textContent = RISK_LABELS[tweak.risk];
  meta.append(group, risk);
  const title = document.createElement("strong");
  title.textContent = tweak.label;
  const target = document.createElement("code");
  target.textContent = `${tweak.hive}\\${tweak.keyPath} → ${tweak.valueName || "(Default)"}`;
  content.append(meta, title, target);

  const actions = document.createElement("div");
  actions.className = "tweak-actions";
  actions.append(
    actionButton("edit", tweak.id, "編集"),
    actionButton("delete", tweak.id, "削除"),
  );
  card.append(indexElement, content, actions);
  return card;
}

export function renderTweakList(container: HTMLElement, project: RegistryProject): void {
  container.replaceChildren();
  project.tweaks.forEach((tweak, index) => container.append(tweakCard(tweak, index)));
}

export function renderAsciiPreview(container: HTMLElement, rows: StyledBanner, theme: ConsoleTheme): void {
  const stage = container.closest<HTMLElement>(".ascii-stage");
  stage?.style.setProperty("--ascii-background", theme.backgroundCss);
  stage?.style.setProperty("--ascii-foreground", theme.foregroundCss);
  stage?.style.setProperty("--ascii-primary", theme.bannerPrimaryCss);
  stage?.style.setProperty("--ascii-secondary", theme.bannerSecondaryCss);
  const content = document.createDocumentFragment();
  rows.forEach((row, rowIndex) => {
    row.forEach((segment) => {
      const span = document.createElement("span");
      span.dataset["tone"] = segment.tone;
      span.textContent = segment.text;
      content.append(span);
    });
    if (rowIndex < rows.length - 1) {
      content.append("\n");
    }
  });
  container.replaceChildren(content);
}

export function renderThemeOptions(
  container: HTMLElement,
  selected: ThemeId,
): void {
  container.replaceChildren();
  THEMES.forEach((theme) => {
    const label = document.createElement("label");
    label.className = "theme-option";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "theme";
    radio.value = theme.id;
    radio.checked = theme.id === selected;
    const swatch = document.createElement("i");
    swatch.style.setProperty("--swatch-primary", theme.bannerPrimaryCss);
    swatch.style.setProperty("--swatch-secondary", theme.bannerSecondaryCss);
    const name = document.createElement("span");
    name.textContent = theme.name;
    label.append(radio, swatch, name);
    container.append(label);
  });
}
