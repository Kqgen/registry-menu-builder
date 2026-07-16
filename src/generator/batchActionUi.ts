import type { RegistryProject } from "../domain/types.ts";
import { BATCH_COPY, BATCH_LOCALE_IDS, type BatchLocaleCopy } from "./batchLocale.ts";
import {
  echo,
  fieldText,
  labelIndex,
  pageLabel,
  panelEcho,
  ruleEcho,
  strongRuleEcho,
} from "./batchUiLayout.ts";

function buildLanguageSelection(width: number, showBanner: string): readonly string[] {
  return [
    ":language_select",
    "cls",
    showBanner,
    echo(),
    ruleEcho("LANGUAGE / 言語", width),
    panelEcho("  Choose your display language / 表示言語を選択してください", width),
    panelEcho("", width),
    panelEcho("  [1]  日本語", width),
    panelEcho("  [2]  English", width),
    strongRuleEcho(width),
    "choice /c 12 /n /m \"LANGUAGE / 言語 > \"",
    "if errorlevel 2 goto language_en",
    "if errorlevel 1 goto language_ja",
    "goto language_select",
    "",
    ":language_ja",
    "set \"TF_LANG=ja\"",
    "goto language_selected",
    "",
    ":language_en",
    "set \"TF_LANG=en\"",
    "goto language_selected",
    "",
    ":language_selected",
    "goto %TF_LANGUAGE_RETURN%",
    "",
    ":change_language",
    `set "TF_LANGUAGE_RETURN=${pageLabel(0)}"`,
    "goto language_select",
    "",
  ];
}

type FatalMessage = "elevationFailed" | "stateDirectoryFailed" | "engineFailed";

function buildFatalScreen(
  label: string,
  message: FatalMessage,
  width: number,
  showBanner: string,
): readonly string[] {
  const lines = [
    `:${label}`,
    `if /i "%TF_LANG%"=="ja" goto ${label}_ja`,
    `goto ${label}_en`,
    "",
  ];
  for (const id of BATCH_LOCALE_IDS) {
    const copy = BATCH_COPY[id];
    lines.push(
      `:${label}_${id}`,
      "cls",
      showBanner,
      echo(),
      ruleEcho(copy.sections.result, width),
      panelEcho(copy.messages[message], width),
      strongRuleEcho(width),
      panelEcho(copy.messages.exitPrompt, width),
      "pause >nul",
      "exit /b 1",
      "",
    );
  }
  return lines;
}

function buildAdministratorNotice(width: number): readonly string[] {
  const lines = [
    ":show_administrator_notice",
    "if /i \"%TF_LANG%\"==\"ja\" goto show_administrator_notice_ja",
    "goto show_administrator_notice_en",
    "",
  ];
  for (const id of BATCH_LOCALE_IDS) {
    lines.push(
      `:show_administrator_notice_${id}`,
      panelEcho(BATCH_COPY[id].messages.administratorRequired, width),
      "exit /b 0",
      "",
    );
  }
  return lines;
}

export function buildStartupUi(width: number, showBanner: string): readonly string[] {
  return [
    ...buildLanguageSelection(width, showBanner),
    ...buildAdministratorNotice(width),
    ...buildFatalScreen("elevation_failed", "elevationFailed", width, showBanner),
    ...buildFatalScreen("state_directory_failed", "stateDirectoryFailed", width, showBanner),
    ...buildFatalScreen("engine_failed", "engineFailed", width, showBanner),
  ];
}

function buildActionDispatchers(): readonly string[] {
  return [
    ":apply_all",
    "if /i \"%TF_LANG%\"==\"ja\" goto apply_all_ja",
    "goto apply_all_en",
    "",
    ":restore_all",
    "if /i \"%TF_LANG%\"==\"ja\" goto restore_all_ja",
    "goto restore_all_en",
    "",
    ":restore_point",
    "if /i \"%TF_LANG%\"==\"ja\" goto restore_point_ja",
    "goto restore_point_en",
    "",
  ];
}

function actionHeader(
  copy: BatchLocaleCopy,
  width: number,
  showBanner: string,
  title: string,
  description: string,
  prompt: string,
): readonly string[] {
  return [
    "cls",
    showBanner,
    echo(),
    ruleEcho(copy.sections.confirmation, width),
    panelEcho(`  ${title}`, width),
    panelEcho(`  ${description}`, width),
    strongRuleEcho(width),
    `choice /c YN /n /m "${prompt}"`,
    `if errorlevel 2 goto ${pageLabel(0)}`,
  ];
}

function conditionalPanel(condition: string, value: string, width: number): string {
  return `${condition} ${panelEcho(value, width)}`;
}

function resultLines(
  copy: BatchLocaleCopy,
  project: RegistryProject,
  width: number,
  success: string,
  failure: string,
): readonly string[] {
  return [
    echo(),
    ruleEcho(copy.sections.result, width),
    conditionalPanel('if "%RB_FAILED%"=="0"', success, width),
    conditionalPanel('if not "%RB_FAILED%"=="0"', failure, width),
    panelEcho(fieldText(copy.fields.log, `.tweakforge-state\\${project.projectId}\\actions.log`), width),
    strongRuleEcho(width),
    "call :wait_for_return",
    `goto ${pageLabel(0)}`,
    "",
  ];
}

function buildBulkActions(
  project: RegistryProject,
  width: number,
  showBanner: string,
  copy: BatchLocaleCopy,
): readonly string[] {
  const applyCalls = project.tweaks.flatMap((_, index) => [
    `call :run_apply_${labelIndex(index)}`,
    "if errorlevel 1 set \"RB_FAILED=1\"",
  ]);
  const restoreCalls = [...project.tweaks].reverse().flatMap((_, reverseIndex) => {
    const index = project.tweaks.length - reverseIndex - 1;
    return [
      `call :run_restore_${labelIndex(index)}`,
      "if errorlevel 1 set \"RB_FAILED=1\"",
    ];
  });
  return [
    `:apply_all_${copy.id}`,
    ...actionHeader(
      copy,
      width,
      showBanner,
      copy.messages.applyAllTitle,
      copy.messages.applyAllDescription,
      copy.messages.applyAllPrompt,
    ),
    "set \"RB_FAILED=0\"",
    ...applyCalls,
    ...resultLines(copy, project, width, copy.messages.applyAllSuccess, copy.messages.applyAllFailure),
    `:restore_all_${copy.id}`,
    ...actionHeader(
      copy,
      width,
      showBanner,
      copy.messages.restoreAllTitle,
      copy.messages.restoreAllDescription,
      copy.messages.restoreAllPrompt,
    ),
    "set \"RB_FAILED=0\"",
    ...restoreCalls,
    ...resultLines(copy, project, width, copy.messages.restoreAllSuccess, copy.messages.restoreAllFailure),
    `:restore_point_${copy.id}`,
    ...actionHeader(
      copy,
      width,
      showBanner,
      copy.messages.restorePointTitle,
      copy.messages.restorePointDescription,
      copy.messages.restorePointPrompt,
    ),
    "set \"RB_FAILED=0\"",
    'powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%RB_ENGINE%" -Action RestorePoint -Language "%TF_LANG%"',
    "if errorlevel 1 set \"RB_FAILED=1\"",
    ...resultLines(copy, project, width, copy.messages.restorePointSuccess, copy.messages.restorePointFailure),
  ];
}

function buildWaitForReturn(width: number): readonly string[] {
  const lines = [
    ":wait_for_return",
    "if /i \"%TF_LANG%\"==\"ja\" goto wait_for_return_ja",
    "goto wait_for_return_en",
    "",
  ];
  for (const id of BATCH_LOCALE_IDS) {
    lines.push(
      `:wait_for_return_${id}`,
      panelEcho(BATCH_COPY[id].messages.returnPrompt, width),
      "pause >nul",
      "exit /b 0",
      "",
    );
  }
  return lines;
}

export function buildActionUi(
  project: RegistryProject,
  width: number,
  showBanner: string,
): readonly string[] {
  return [
    ...buildActionDispatchers(),
    ...BATCH_LOCALE_IDS.flatMap((id) => buildBulkActions(project, width, showBanner, BATCH_COPY[id])),
    ...buildWaitForReturn(width),
  ];
}
