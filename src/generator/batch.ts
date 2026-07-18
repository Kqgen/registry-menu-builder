import { getTheme } from "../domain/themes.ts";
import type { RegistryProject } from "../domain/types.ts";
import { validateProject } from "../domain/validation.ts";
import { renderAsciiBanner, renderStyledAsciiBanner } from "./ascii.ts";
import { buildConsoleBannerCommand, buildConsoleBannerPayload } from "./consoleBanner.ts";
import { consoleDisplayWidth } from "./consoleLayout.ts";
import { buildInteractiveUi, escapeBatchText, labelIndex } from "./batchUi.ts";
import { chunkBase64, encodeUtf8BomBase64 } from "./encoding.ts";
import { getBatchItems } from "./batchItems.ts";
import {
  buildBootstrapEncodedCommand,
  buildExtractorEncodedCommand,
  buildPowerShellEngine,
} from "./powershell.ts";
import {
  buildElevatedBootstrapEncodedCommand,
  buildElevationEncodedCommand,
} from "./elevatedBootstrap.ts";
import { buildTrustedRuntimeEncodedCommand } from "./trustedRuntime.ts";

export { escapeBatchText };

export class InvalidProjectError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(issues.join("\n"));
    this.name = "InvalidProjectError";
    this.issues = issues;
  }
}

function buildRunnerLabels(project: RegistryProject): readonly string[] {
  return getBatchItems(project).flatMap((item, index) => [
    `:run_apply_${labelIndex(index)}`,
    `"%TF_POWERSHELL%" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%RB_ENGINE%" -Action Apply -TweakId "${item.id}" -Language "%TF_LANG%"`,
    "exit /b %errorlevel%",
    "",
    `:run_restore_${labelIndex(index)}`,
    `"%TF_POWERSHELL%" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%RB_ENGINE%" -Action Restore -TweakId "${item.id}" -Language "%TF_LANG%"`,
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
  const trustedPayload = chunkBase64(buildTrustedRuntimeEncodedCommand(project.projectId), 1000);
  const elevatedPayload = chunkBase64(buildElevatedBootstrapEncodedCommand(), 1000);
  const lines = [
    "@echo off",
    "setlocal EnableExtensions DisableDelayedExpansion",
    "set \"TF_SYSTEM32=%SystemRoot%\\System32\"",
    "set \"TF_POWERSHELL=%TF_SYSTEM32%\\WindowsPowerShell\\v1.0\\powershell.exe\"",
    "set \"TF_CHCP=%TF_SYSTEM32%\\chcp.com\"",
    "set \"TF_MODE=%TF_SYSTEM32%\\mode.com\"",
    "set \"TF_CHOICE=%TF_SYSTEM32%\\choice.exe\"",
    "set \"RB_SELF=%~f0\"",
    "set \"TF_SELF=%~f0\"",
    "if /i \"%~1\"==\"--tweakforge-utf8\" goto utf8_ready",
    "\"%TF_CHCP%\" 65001 >nul",
    `"%TF_POWERSHELL%" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${buildBootstrapEncodedCommand()}`,
    "exit /b %errorlevel%",
    ":utf8_ready",
    "shift /1",
    "if /i \"%~3\"==\"--trusted-runtime\" if defined TF_TRUSTED_SYSTEM32 set \"TF_SYSTEM32=%TF_TRUSTED_SYSTEM32%\"",
    "set \"TF_POWERSHELL=%TF_SYSTEM32%\\WindowsPowerShell\\v1.0\\powershell.exe\"",
    "set \"TF_CHCP=%TF_SYSTEM32%\\chcp.com\"",
    "set \"TF_MODE=%TF_SYSTEM32%\\mode.com\"",
    "set \"TF_CHOICE=%TF_SYSTEM32%\\choice.exe\"",
    "\"%TF_CHCP%\" 65001 >nul",
    `title ${escapeBatchText(project.title)}`,
    `color ${theme.consoleColor}`,
    `"%TF_MODE%" con: cols=${Math.min(220, Math.max(80, width + 2))} lines=48 >nul 2>&1`,
    "set \"TF_BANNER=\"",
    ...chunkBase64(bannerPayload, 1000).map((chunk) => `set "TF_BANNER=%TF_BANNER%${chunk}"`),
    "set \"RB_ROOT=%~dp0\"",
    "set \"RB_STATE=%TF_STATE_ROOT%\"",
    "set \"RB_ENGINE=%TF_RUNTIME_ROOT%\\engine.ps1\"",
    "set \"RB_LOG=%RB_STATE%\\actions.log\"",
    "set \"TF_LANG=\"",
    "set \"TF_TRUSTED_RUNTIME=\"",
    "set \"TF_LANGUAGE_RETURN=runtime_prepare\"",
    "if /i \"%~1\"==\"--lang\" if /i \"%~2\"==\"ja\" set \"TF_LANG=ja\"",
    "if /i \"%~1\"==\"--lang\" if /i \"%~2\"==\"en\" set \"TF_LANG=en\"",
    "if /i \"%~3\"==\"--trusted-runtime\" set \"TF_TRUSTED_RUNTIME=1\"",
    "if defined TF_LANG goto runtime_prepare",
    "goto language_select",
    "",
    ":runtime_prepare",
    "if defined TF_TRUSTED_RUNTIME goto trusted_runtime",
    "call :show_administrator_notice",
    `"%TF_POWERSHELL%" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${buildElevationEncodedCommand()}`,
    "if errorlevel 1 goto elevation_failed",
    "exit /b 0",
    "",
    ":trusted_runtime",
    "if not defined TF_STATE_ROOT goto state_directory_failed",
    "if not defined TF_RUNTIME_ROOT goto state_directory_failed",
    "if not defined TF_TRUSTED_SYSTEM32 goto state_directory_failed",
    "if not exist \"%RB_STATE%\" goto state_directory_failed",
    "if not exist \"%TF_RUNTIME_ROOT%\" goto state_directory_failed",
    `"%TF_POWERSHELL%" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${buildExtractorEncodedCommand()}`,
    "if errorlevel 1 goto engine_failed",
    "goto menu_001",
    "",
    ...buildInteractiveUi(project, width, bannerCommand),
    ...buildRunnerLabels(project),
    ":quit",
    "if defined TF_RUNTIME_ROOT del /q \"%RB_ENGINE%\" >nul 2>&1",
    "endlocal",
    "exit /b 0",
    ":RB_ENGINE_BEGIN",
    ...payload.map((chunk) => `:${chunk}`),
    ":RB_ENGINE_END",
    ":RB_TRUSTED_BEGIN",
    ...trustedPayload.map((chunk) => `:${chunk}`),
    ":RB_TRUSTED_END",
    ":RB_ELEVATED_BEGIN",
    ...elevatedPayload.map((chunk) => `:${chunk}`),
    ":RB_ELEVATED_END",
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
