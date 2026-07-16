import type { RegistryProject } from "../domain/types.ts";
import { BATCH_COPY, BATCH_LOCALE_IDS, type BatchLocaleCopy } from "./batchLocale.ts";
import {
  PAGE_SIZE,
  actionText,
  choiceDispatch,
  displayData,
  echo,
  fieldText,
  labelIndex,
  pageLabel,
  panelEcho,
  ruleEcho,
  strongRuleEcho,
  type ChoiceRoute,
} from "./batchUiLayout.ts";
import { padConsoleText } from "./consoleLayout.ts";

function localizedPageLabel(copy: BatchLocaleCopy, index: number): string {
  return `menu_${copy.id}_${labelIndex(index)}`;
}

function buildMenuDispatchers(project: RegistryProject): readonly string[] {
  const lines: string[] = [];
  const pageCount = Math.ceil(project.tweaks.length / PAGE_SIZE);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    lines.push(
      `:${pageLabel(pageIndex)}`,
      `if /i "%TF_LANG%"=="ja" goto ${localizedPageLabel(BATCH_COPY.ja, pageIndex)}`,
      `goto ${localizedPageLabel(BATCH_COPY.en, pageIndex)}`,
      "",
    );
  }
  return lines;
}

function buildMenuPages(
  project: RegistryProject,
  width: number,
  showBanner: string,
  copy: BatchLocaleCopy,
): readonly string[] {
  const lines: string[] = [];
  const pageCount = Math.ceil(project.tweaks.length / PAGE_SIZE);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const start = pageIndex * PAGE_SIZE;
    const tweaks = project.tweaks.slice(start, start + PAGE_SIZE);
    lines.push(
      `:${localizedPageLabel(copy, pageIndex)}`,
      "cls",
      showBanner,
      echo(),
      ruleEcho(copy.sections.profile, width),
      panelEcho(fieldText(copy.fields.tool, project.title), width),
      panelEcho(fieldText(copy.fields.description, project.subtitle), width),
      panelEcho(fieldText(copy.fields.count, copy.readyText(project.tweaks.length)), width),
      panelEcho(fieldText(copy.fields.page, copy.pageText(pageIndex + 1, pageCount)), width),
      ruleEcho(copy.sections.tweaks, width),
    );
    const routes: ChoiceRoute[] = [];
    tweaks.forEach((tweak, localIndex) => {
      const absoluteIndex = start + localIndex;
      const key = String(localIndex + 1);
      const risk = padConsoleText(`[${copy.risk[tweak.risk]}]`, 10);
      lines.push(panelEcho(`  [${key}]  ${risk}${tweak.group} / ${tweak.label}`, width));
      routes.push({ key, label: `detail_${labelIndex(absoluteIndex)}` });
    });
    lines.push(
      ruleEcho(copy.sections.actions, width),
      panelEcho(actionText("A", copy.actions.applyAll), width),
      panelEcho(actionText("R", copy.actions.restoreAll), width),
      panelEcho(actionText("P", copy.actions.restorePoint), width),
      panelEcho(actionText("L", copy.actions.language), width),
    );
    routes.push(
      { key: "A", label: "apply_all" },
      { key: "R", label: "restore_all" },
      { key: "P", label: "restore_point" },
      { key: "L", label: "change_language" },
    );
    if (pageIndex < pageCount - 1) {
      lines.push(panelEcho(actionText("X", copy.actions.next), width));
      routes.push({ key: "X", label: pageLabel(pageIndex + 1) });
    }
    if (pageIndex > 0) {
      lines.push(panelEcho(actionText("Z", copy.actions.previous), width));
      routes.push({ key: "Z", label: pageLabel(pageIndex - 1) });
    }
    lines.push(panelEcho(actionText("Q", copy.actions.quit), width), strongRuleEcho(width));
    routes.push({ key: "Q", label: "quit" });
    lines.push(...choiceDispatch(routes, copy.messages.selectAction), "goto :eof", "");
  }
  return lines;
}

function buildDetailDispatchers(project: RegistryProject): readonly string[] {
  return project.tweaks.flatMap((_, index) => [
    `:detail_${labelIndex(index)}`,
    `if /i "%TF_LANG%"=="ja" goto detail_ja_${labelIndex(index)}`,
    `goto detail_en_${labelIndex(index)}`,
    "",
  ]);
}

function buildDetailPages(
  project: RegistryProject,
  width: number,
  showBanner: string,
  copy: BatchLocaleCopy,
): readonly string[] {
  const lines: string[] = [];
  project.tweaks.forEach((tweak, index) => {
    const pageIndex = Math.floor(index / PAGE_SIZE);
    lines.push(
      `:detail_${copy.id}_${labelIndex(index)}`,
      "cls",
      showBanner,
      echo(),
      ruleEcho(`TWEAK ${labelIndex(index)} / ${project.tweaks.length.toString().padStart(3, "0")}`, width),
      panelEcho(fieldText(copy.fields.name, tweak.label), width),
      panelEcho(fieldText(copy.fields.description, tweak.description), width),
      ruleEcho(copy.sections.target, width),
      panelEcho(fieldText(copy.fields.group, tweak.group), width),
      panelEcho(fieldText(copy.fields.key, `${tweak.hive}\\${tweak.keyPath}`), width),
      panelEcho(fieldText(copy.fields.value, tweak.valueName || copy.messages.defaultValue), width),
      panelEcho(fieldText(copy.fields.operation, `${copy.operation[tweak.operation]} / ${tweak.valueType}`), width),
      panelEcho(fieldText(copy.fields.data, displayData(tweak, copy)), width),
      ruleEcho(copy.sections.safety, width),
      panelEcho(fieldText(copy.fields.risk, copy.risk[tweak.risk]), width),
      panelEcho(`  ${copy.messages.backupNotice}`, width),
      ruleEcho(copy.sections.actions, width),
      panelEcho(actionText("A", copy.actions.applyOne), width),
      panelEcho(actionText("R", copy.actions.restoreOne), width),
      panelEcho(actionText("B", copy.actions.back), width),
      strongRuleEcho(width),
      ...choiceDispatch(
        [
          { key: "A", label: `detail_apply_${labelIndex(index)}` },
          { key: "R", label: `detail_restore_${labelIndex(index)}` },
          { key: "B", label: pageLabel(pageIndex) },
        ],
        copy.messages.selectAction,
      ),
      "goto :eof",
      "",
    );
  });
  return lines;
}

function buildDetailActions(project: RegistryProject): readonly string[] {
  return project.tweaks.flatMap((_, index) => [
    `:detail_apply_${labelIndex(index)}`,
    `call :run_apply_${labelIndex(index)}`,
    "call :wait_for_return",
    `goto detail_${labelIndex(index)}`,
    "",
    `:detail_restore_${labelIndex(index)}`,
    `call :run_restore_${labelIndex(index)}`,
    "call :wait_for_return",
    `goto detail_${labelIndex(index)}`,
    "",
  ]);
}

export function buildMenuUi(
  project: RegistryProject,
  width: number,
  showBanner: string,
): readonly string[] {
  return [
    ...buildMenuDispatchers(project),
    ...BATCH_LOCALE_IDS.flatMap((id) => buildMenuPages(project, width, showBanner, BATCH_COPY[id])),
    ...buildDetailDispatchers(project),
    ...BATCH_LOCALE_IDS.flatMap((id) => buildDetailPages(project, width, showBanner, BATCH_COPY[id])),
    ...buildDetailActions(project),
  ];
}
