import { getTheme } from "../domain/themes.ts";
import type { RegistryProject, RegistryTweak } from "../domain/types.ts";
import { validateProject } from "../domain/validation.ts";
import { renderAsciiBanner, renderStyledAsciiBanner } from "./ascii.ts";
import { buildConsoleBannerCommand, buildConsoleBannerPayload } from "./consoleBanner.ts";
import { consoleDisplayWidth, sectionRule, strongRule, truncateConsoleText } from "./consoleLayout.ts";
import { chunkBase64, encodeUtf8BomBase64 } from "./encoding.ts";
import {
  buildBootstrapEncodedCommand,
  buildElevationEncodedCommand,
  buildExtractorEncodedCommand,
  buildPowerShellEngine,
} from "./powershell.ts";

const PAGE_SIZE = 8;

export class InvalidProjectError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(issues.join("\n"));
    this.name = "InvalidProjectError";
    this.issues = issues;
  }
}

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

function labelIndex(index: number): string {
  return (index + 1).toString().padStart(3, "0");
}

function pageLabel(index: number): string {
  return `menu_${labelIndex(index)}`;
}

function echo(value = ""): string {
  return `echo(${value}`;
}

function menuText(value: string, width: number): string {
  return escapeBatchText(truncateConsoleText(value, Math.max(1, width - 2)));
}

function displayData(tweak: RegistryTweak): string {
  if (tweak.operation === "delete") {
    return "DELETE VALUE";
  }
  return tweak.data.replaceAll("\r", "").replaceAll("\n", "\\n");
}

interface ChoiceRoute {
  readonly key: string;
  readonly label: string;
}

function choiceDispatch(routes: readonly ChoiceRoute[], prompt: string): readonly string[] {
  const keys = routes.map((route) => route.key).join("");
  const lines = [`choice /c ${keys} /n /m "${prompt}"`];
  for (let index = routes.length - 1; index >= 0; index -= 1) {
    const route = routes[index];
    if (route !== undefined) {
      lines.push(`if errorlevel ${index + 1} goto ${route.label}`);
    }
  }
  return lines;
}

function buildMenuPages(project: RegistryProject, width: number, bannerCommand: string): readonly string[] {
  const lines: string[] = [];
  const pageCount = Math.ceil(project.tweaks.length / PAGE_SIZE);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const start = pageIndex * PAGE_SIZE;
    const tweaks = project.tweaks.slice(start, start + PAGE_SIZE);
    lines.push(`:${pageLabel(pageIndex)}`, "cls", bannerCommand, echo());
    lines.push(
      echo(sectionRule("TWEAK PROFILE", width)),
      echo(menuText(`  PROFILE    ${project.title}`, width)),
      echo(menuText(`  POLICY     ${project.subtitle}`, width)),
      echo(`  LOADOUT    ${project.tweaks.length.toString().padStart(2, "0")} GAMING TWEAKS READY     PAGE ${(pageIndex + 1).toString().padStart(2, "0")} / ${pageCount.toString().padStart(2, "0")}`),
      echo(sectionRule("GAMING LOADOUT", width)),
    );
    const routes: ChoiceRoute[] = [];
    tweaks.forEach((tweak, localIndex) => {
      const absoluteIndex = start + localIndex;
      const key = String(localIndex + 1);
      const entry = `  [${key}]  ${tweak.risk.toUpperCase().padEnd(6)} ${tweak.group.toUpperCase()}  /  ${tweak.label}`;
      lines.push(echo(menuText(entry, width)));
      routes.push({ key, label: `detail_${labelIndex(absoluteIndex)}` });
    });
    lines.push(
      echo(),
      echo(sectionRule("COMMAND DECK", width)),
      echo("  [A] DEPLOY FULL GAMING LOADOUT      [R] RESTORE SAVED SETTINGS"),
      echo("  [P] CREATE SAFETY CHECKPOINT        [Q] EXIT TWEAK FORGE"),
    );
    routes.push(
      { key: "A", label: "apply_all" },
      { key: "R", label: "restore_all" },
      { key: "P", label: "restore_point" },
    );
    if (pageIndex < pageCount - 1) {
      lines.push(echo("  [X] NEXT LOADOUT PAGE"));
      routes.push({ key: "X", label: pageLabel(pageIndex + 1) });
    }
    if (pageIndex > 0) {
      lines.push(echo("  [Z] PREVIOUS LOADOUT PAGE"));
      routes.push({ key: "Z", label: pageLabel(pageIndex - 1) });
    }
    lines.push(echo(strongRule(width)));
    routes.push({ key: "Q", label: "quit" });
    lines.push(...choiceDispatch(routes, "LOADOUT COMMAND > "), "goto :eof", "");
  }
  return lines;
}

function buildDetailPages(project: RegistryProject, width: number): readonly string[] {
  const lines: string[] = [];
  project.tweaks.forEach((tweak, index) => {
    const pageIndex = Math.floor(index / PAGE_SIZE);
    lines.push(
      `:detail_${labelIndex(index)}`,
      "cls",
      echo(sectionRule(`GAMING TWEAK ${(index + 1).toString().padStart(2, "0")} / ${project.tweaks.length.toString().padStart(2, "0")}`, width)),
      echo(menuText(`  MODULE     ${tweak.label}`, width)),
      echo(menuText(`  SUMMARY    ${tweak.description}`, width)),
      echo(sectionRule("TARGET CONFIGURATION", width)),
      echo(menuText(`  GROUP       ${tweak.group}`, width)),
      echo(menuText(`  TARGET      ${tweak.hive}\\${tweak.keyPath}`, width)),
      echo(menuText(`  VALUE       ${tweak.valueName || "(Default)"}`, width)),
      echo(menuText(`  ACTION      ${tweak.operation.toUpperCase()} / ${tweak.valueType}`, width)),
      echo(menuText(`  DATA        ${displayData(tweak)}`, width)),
      echo(sectionRule("SAFETY STATUS", width)),
      echo(`  RISK        ${tweak.risk.toUpperCase()}     BACKUP REQUIRED BEFORE DEPLOYMENT`),
      echo(sectionRule("COMMAND DECK", width)),
      echo("  [A] DEPLOY THIS TWEAK   [R] RESTORE THIS TWEAK   [B] BACK TO LOADOUT"),
      echo(strongRule(width)),
      ...choiceDispatch(
        [
          { key: "A", label: `detail_apply_${labelIndex(index)}` },
          { key: "R", label: `detail_restore_${labelIndex(index)}` },
          { key: "B", label: pageLabel(pageIndex) },
        ],
        "TWEAK COMMAND > ",
      ),
      "goto :eof",
      "",
      `:detail_apply_${labelIndex(index)}`,
      `call :run_apply_${labelIndex(index)}`,
      "pause",
      `goto detail_${labelIndex(index)}`,
      "",
      `:detail_restore_${labelIndex(index)}`,
      `call :run_restore_${labelIndex(index)}`,
      "pause",
      `goto detail_${labelIndex(index)}`,
      "",
    );
  });
  return lines;
}

function buildBulkActions(project: RegistryProject): readonly string[] {
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
    ":apply_all",
    "cls",
    echo("DEPLOY FULL GAMING LOADOUT captures every original value before tuning."),
    "choice /c YN /n /m \"DEPLOY LOADOUT? [Y/N] > \"",
    `if errorlevel 2 goto ${pageLabel(0)}`,
    "set \"RB_FAILED=0\"",
    ...applyCalls,
    "if \"%RB_FAILED%\"==\"0\" echo(Full gaming loadout deployed.",
    "if not \"%RB_FAILED%\"==\"0\" echo(One or more gaming tweaks failed. Check the log.",
    "pause",
    `goto ${pageLabel(0)}`,
    "",
    ":restore_all",
    "cls",
    echo("RESTORE SAVED SETTINGS uses only validated backups from this loadout."),
    "choice /c YN /n /m \"RESTORE SETTINGS? [Y/N] > \"",
    `if errorlevel 2 goto ${pageLabel(0)}`,
    "set \"RB_FAILED=0\"",
    ...restoreCalls,
    "if \"%RB_FAILED%\"==\"0\" echo(All available saved settings restored.",
    "if not \"%RB_FAILED%\"==\"0\" echo(One or more rollbacks failed. Check the log.",
    "pause",
    `goto ${pageLabel(0)}`,
    "",
    ":restore_point",
    "cls",
    echo("Windows may reject restore-point creation when System Protection is disabled."),
    "powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File \"%RB_ENGINE%\" -Action RestorePoint",
    "pause",
    `goto ${pageLabel(0)}`,
    "",
  ];
}

function buildRunnerLabels(project: RegistryProject): readonly string[] {
  return project.tweaks.flatMap((tweak, index) => [
    `:run_apply_${labelIndex(index)}`,
    `powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%RB_ENGINE%" -Action Apply -TweakId "${tweak.id}"`,
    "exit /b %errorlevel%",
    "",
    `:run_restore_${labelIndex(index)}`,
    `powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%RB_ENGINE%" -Action Restore -TweakId "${tweak.id}"`,
    "exit /b %errorlevel%",
    "",
  ]);
}

export function generateBatch(project: RegistryProject): string {
  const issues = validateProject(project);
  if (issues.length > 0) {
    throw new InvalidProjectError(issues.map((issue) => issue.message));
  }
  const theme = getTheme(project.theme);
  const styledBanner = renderStyledAsciiBanner(project.bannerText, project.bannerStyle);
  const banner = renderAsciiBanner(project.bannerText, project.bannerStyle);
  const width = Math.max(118, ...banner.map((line) => consoleDisplayWidth(line) + 4));
  const bannerPayload = buildConsoleBannerPayload(styledBanner, width);
  const bannerCommand = buildConsoleBannerCommand(theme);
  const engine = buildPowerShellEngine(project);
  const payload = chunkBase64(encodeUtf8BomBase64(engine));
  const lines = [
    "@echo off",
    "setlocal EnableExtensions DisableDelayedExpansion",
    "if /i \"%~1\"==\"--tweakforge-utf8\" goto utf8_ready",
    "set \"TF_SELF=%~f0\"",
    "chcp 65001 >nul",
    `powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${buildBootstrapEncodedCommand()}`,
    "exit /b %errorlevel%",
    ":utf8_ready",
    "shift /1",
    "chcp 65001 >nul",
    `title ${escapeBatchText(project.title)}`,
    `color ${theme.consoleColor}`,
    `mode con: cols=${Math.min(220, Math.max(80, width + 2))} lines=42 >nul 2>&1`,
    "set \"TF_BANNER=\"",
    ...chunkBase64(bannerPayload, 1000).map((chunk) => `set "TF_BANNER=%TF_BANNER%${chunk}"`),
    "set \"RB_SELF=%~f0\"",
    "set \"RB_ROOT=%~dp0\"",
    `set "RB_STATE=%~dp0.tweakforge-state\\${project.projectId}"`,
    "set \"RB_ENGINE=%RB_STATE%\\engine-%RANDOM%-%RANDOM%.ps1\"",
    "set \"RB_LOG=%RB_STATE%\\actions.log\"",
    "fltmc >nul 2>&1",
    "if not errorlevel 1 goto elevated",
    echo("Administrator approval is required."),
    `powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${buildElevationEncodedCommand()}`,
    "if errorlevel 1 echo(Elevation was cancelled or failed.",
    "if errorlevel 1 pause",
    "exit /b 1",
    "",
    ":elevated",
    "if not exist \"%RB_STATE%\" mkdir \"%RB_STATE%\" >nul 2>&1",
    "if not exist \"%RB_STATE%\" echo(State directory could not be created.",
    "if not exist \"%RB_STATE%\" pause",
    "if not exist \"%RB_STATE%\" exit /b 1",
    `powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${buildExtractorEncodedCommand()}`,
    "if errorlevel 1 echo(Embedded engine could not be prepared.",
    "if errorlevel 1 pause",
    "if errorlevel 1 exit /b 1",
    `goto ${pageLabel(0)}`,
    "",
    ...buildMenuPages(project, width, bannerCommand),
    ...buildDetailPages(project, width),
    ...buildBulkActions(project),
    ...buildRunnerLabels(project),
    ":quit",
    "del /q \"%RB_ENGINE%\" >nul 2>&1",
    "endlocal",
    "exit /b 0",
    ":RB_ENGINE_BEGIN",
    ...payload.map((chunk) => `:${chunk}`),
    ":RB_ENGINE_END",
    "",
  ];
  const overlong = lines.find((line) => line.length > 7900);
  if (overlong !== undefined) {
    throw new Error("Generated BAT contains an overlong command line.");
  }
  return lines.join("\r\n");
}

export function projectFilename(project: RegistryProject, extension: "bat" | "json"): string {
  const normalized = project.title
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, "-")
    .replace(/[. ]+$/gu, "")
    .trim()
    .slice(0, 48);
  const reserved = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/iu;
  const base = normalized.length === 0 || reserved.test(normalized) ? "gaming-tweaks" : normalized;
  return `${base}.${extension}`;
}
