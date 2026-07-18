import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createEmptyPowerPlanAction, DEFAULT_PROJECT } from "../domain/defaults.ts";
import { BANNER_STYLE_IDS, THEME_IDS } from "../domain/types.ts";
import { generateBatch } from "./batch.ts";

const MENU_GUARD_ANCHOR = 'set "RB_LOG=%RB_STATE%\\actions.log"';
const RUNTIME_GUARD_ANCHOR = "if defined TF_TRUSTED_RUNTIME goto trusted_runtime";

describe("generated BAT console rendering", { timeout: 30_000 }, () => {
  it.each(BANNER_STYLE_IDS)("renders %s from a CP932 parent without parser errors", (bannerStyle) => {
    const root = mkdtempSync(join(tmpdir(), `tweakforge-${bannerStyle}-`));
    try {
      const batchPath = join(root, `visual ${bannerStyle}.bat`);
      const wrapperPath = join(root, "launch.bat");
      const generated = generateBatch({ ...DEFAULT_PROJECT, bannerStyle });
      const instrumented = generated.replace(
        MENU_GUARD_ANCHOR,
        `${MENU_GUARD_ANCHOR}\r\nif /i "%TF_VISUAL_TEST%"=="1" goto menu_001`,
      );
      expect(instrumented).not.toBe(generated);
      writeFileSync(batchPath, instrumented, "utf8");
      writeFileSync(wrapperPath, [
        "@echo off",
        "chcp 932 >nul",
        "set \"TF_VISUAL_TEST=1\"",
        `(echo Q)|call "${batchPath}"`,
        "exit /b %errorlevel%",
        "",
      ].join("\r\n"), "ascii");
      const result = spawnSync("cmd.exe", ["/d", "/v:off", "/c", wrapperPath], {
        encoding: "utf8",
        timeout: 30_000,
        windowsHide: true,
      });
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      expect(result.status, output).toBe(0);
      expect(output).not.toMatch(/not recognized|認識されていません|�/iu);
      expect(output).toContain("PROFILE");
      expect(output).toContain("ITEM LIST");
      expect(output).toContain("ファイル拡張子を表示");
      expect(output).toContain("SELECT ACTION >");
      expect(output).toContain("|   [A]  Apply every item");
      expect(output).toMatch(bannerStyle === "ghost" ? /[━┃╱╲+]/u : /[█▀▄]/u);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each(THEME_IDS)("renders theme %s through the console color path", (theme) => {
    const root = mkdtempSync(join(tmpdir(), `tweakforge-theme-${theme}-`));
    try {
      const batchPath = join(root, `theme ${theme}.bat`);
      const wrapperPath = join(root, "launch.bat");
      const generated = generateBatch({ ...DEFAULT_PROJECT, theme });
      const instrumented = generated.replace(
        MENU_GUARD_ANCHOR,
        `${MENU_GUARD_ANCHOR}\r\nif /i "%TF_VISUAL_TEST%"=="1" goto menu_001`,
      );
      writeFileSync(batchPath, instrumented, "utf8");
      writeFileSync(wrapperPath, [
        "@echo off",
        "chcp 932 >nul",
        "set \"TF_VISUAL_TEST=1\"",
        `(echo Q)|call "${batchPath}"`,
        "exit /b %errorlevel%",
        "",
      ].join("\r\n"), "ascii");
      const result = spawnSync("cmd.exe", ["/d", "/v:off", "/c", wrapperPath], {
        encoding: "utf8",
        timeout: 30_000,
        windowsHide: true,
      });
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      expect(result.status, output).toBe(0);
      expect(output).not.toMatch(/not recognized|認識されていません|�/iu);
      expect(output).toContain("PROFILE");
      expect(output).toContain("SELECT ACTION >");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("bootstraps from a path containing CMD metacharacters", () => {
    const root = mkdtempSync(join(tmpdir(), "tweakforge-path-"));
    try {
      const nested = join(root, "Tweak Forge & (Verify) 100% !safe!");
      mkdirSync(nested);
      const batchPath = join(nested, "Visual drift.bat");
      const wrapperPath = join(root, "launch.bat");
      const generated = generateBatch({ ...DEFAULT_PROJECT, bannerStyle: "drift" });
      const instrumented = generated.replace(
        MENU_GUARD_ANCHOR,
        `${MENU_GUARD_ANCHOR}\r\nif /i "%TF_VISUAL_TEST%"=="1" goto menu_001`,
      );
      writeFileSync(batchPath, instrumented, "utf8");
      writeFileSync(wrapperPath, [
        "@echo off",
        "setlocal EnableExtensions DisableDelayedExpansion",
        "chcp 932 >nul",
        "set \"TF_VISUAL_TEST=1\"",
        `(echo Q)|call "${batchPath.replaceAll("%", "%%")}"`,
        "exit /b %errorlevel%",
        "",
      ].join("\r\n"), "ascii");
      const result = spawnSync("cmd.exe", ["/d", "/v:off", "/c", wrapperPath], {
        encoding: "utf8",
        timeout: 30_000,
        windowsHide: true,
      });
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      expect(result.status, output).toBe(0);
      expect(output).not.toMatch(/not recognized|認識されていません|�/iu);
      expect(output).toContain("PROFILE");
      expect(output).toContain("ファイル拡張子を表示");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each([
    ["1", "プロファイル", "操作を選択 >"],
    ["2", "PROFILE", "SELECT ACTION >"],
  ])("selects runtime language %s before opening the menu", (selection, heading, prompt) => {
    const root = mkdtempSync(join(tmpdir(), `tweakforge-language-${selection}-`));
    try {
      const batchPath = join(root, `language ${selection}.bat`);
      const wrapperPath = join(root, "launch.bat");
      const generated = generateBatch(DEFAULT_PROJECT);
      const instrumented = generated.replace(
        RUNTIME_GUARD_ANCHOR,
        `if /i "%TF_VISUAL_TEST%"=="1" goto menu_001\r\n${RUNTIME_GUARD_ANCHOR}`,
      );
      expect(instrumented).not.toBe(generated);
      writeFileSync(batchPath, instrumented, "utf8");
      writeFileSync(wrapperPath, [
        "@echo off",
        "chcp 932 >nul",
        "set \"TF_VISUAL_TEST=1\"",
        `(echo ${selection}Q)|call "${batchPath}"`,
        "exit /b %errorlevel%",
        "",
      ].join("\r\n"), "ascii");
      const result = spawnSync("cmd.exe", ["/d", "/v:off", "/c", wrapperPath], {
        encoding: "utf8",
        timeout: 30_000,
        windowsHide: true,
      });
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      expect(result.status, output).toBe(0);
      expect(output).not.toMatch(/not recognized|認識されていません|�/iu);
      expect(output).toContain("LANGUAGE / 言語");
      expect(output).toContain(heading);
      expect(output).toContain(prompt);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each([
    ["ja", "プロファイル", "操作を選択 >"],
    ["en", "PROFILE", "SELECT ACTION >"],
  ])("preserves elevated language argument %s without selecting twice", (language, heading, prompt) => {
    const root = mkdtempSync(join(tmpdir(), `tweakforge-elevated-language-${language}-`));
    try {
      const batchPath = join(root, `elevated language ${language}.bat`);
      const wrapperPath = join(root, "launch.bat");
      const generated = generateBatch(DEFAULT_PROJECT);
      const instrumented = generated.replace(
        RUNTIME_GUARD_ANCHOR,
        `if /i "%TF_VISUAL_TEST%"=="1" goto menu_001\r\n${RUNTIME_GUARD_ANCHOR}`,
      );
      expect(instrumented).not.toBe(generated);
      writeFileSync(batchPath, instrumented, "utf8");
      writeFileSync(wrapperPath, [
        "@echo off",
        "chcp 932 >nul",
        "set \"TF_VISUAL_TEST=1\"",
        `(echo Q)|call "${batchPath}" --tweakforge-utf8 --lang ${language}`,
        "exit /b %errorlevel%",
        "",
      ].join("\r\n"), "ascii");
      const result = spawnSync("cmd.exe", ["/d", "/v:off", "/c", wrapperPath], {
        encoding: "utf8",
        timeout: 30_000,
        windowsHide: true,
      });
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      expect(result.status, output).toBe(0);
      expect(output).not.toMatch(/not recognized|認識されていません|�/iu);
      expect(output).not.toContain("Choose your display language");
      expect(output).toContain(heading);
      expect(output).toContain(prompt);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("renders Japanese detail and confirmation screens without executing actions", () => {
    const root = mkdtempSync(join(tmpdir(), "tweakforge-workflow-ja-"));
    try {
      const batchPath = join(root, "workflow ja.bat");
      const wrapperPath = join(root, "launch.bat");
      const generated = generateBatch(DEFAULT_PROJECT);
      const instrumented = generated.replace(
        MENU_GUARD_ANCHOR,
        `${MENU_GUARD_ANCHOR}\r\nset "TF_LANG=ja"\r\nif /i "%TF_VISUAL_TEST%"=="1" goto menu_001`,
      );
      expect(instrumented).not.toBe(generated);
      writeFileSync(batchPath, instrumented, "utf8");
      writeFileSync(wrapperPath, [
        "@echo off",
        "chcp 932 >nul",
        "set \"TF_VISUAL_TEST=1\"",
        `(echo 1BANQ)|call "${batchPath}"`,
        "exit /b %errorlevel%",
        "",
      ].join("\r\n"), "ascii");
      const result = spawnSync("cmd.exe", ["/d", "/v:off", "/c", wrapperPath], {
        encoding: "utf8",
        timeout: 30_000,
        windowsHide: true,
      });
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      expect(result.status, output).toBe(0);
      expect(output).not.toMatch(/not recognized|認識されていません|�/iu);
      expect(output).toContain("対象");
      expect(output).toContain("安全情報");
      expect(output).toContain("実行前の確認");
      expect(output).toContain("すべて適用しますか？");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("renders a power plan detail screen without invoking powercfg", () => {
    const root = mkdtempSync(join(tmpdir(), "tweakforge-power-plan-"));
    try {
      const batchPath = join(root, "power plan.bat");
      const wrapperPath = join(root, "launch.bat");
      const action = { ...createEmptyPowerPlanAction("en"), id: "power_plan_action" };
      const generated = generateBatch({ ...DEFAULT_PROJECT, tweaks: [], actions: [action] });
      const instrumented = generated.replace(
        MENU_GUARD_ANCHOR,
        `${MENU_GUARD_ANCHOR}\r\nset "TF_LANG=en"\r\nif /i "%TF_VISUAL_TEST%"=="1" goto menu_001`,
      );
      writeFileSync(batchPath, instrumented, "utf8");
      writeFileSync(wrapperPath, [
        "@echo off",
        "chcp 932 >nul",
        "set \"TF_VISUAL_TEST=1\"",
        `(echo 1BQ)|call "${batchPath}"`,
        "exit /b %errorlevel%",
        "",
      ].join("\r\n"), "ascii");
      const result = spawnSync("cmd.exe", ["/d", "/v:off", "/c", wrapperPath], {
        encoding: "utf8",
        timeout: 30_000,
        windowsHide: true,
      });
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      expect(result.status, output).toBe(0);
      expect(output).not.toMatch(/not recognized|認識されていません|�/iu);
      expect(output).toContain("POWER PLAN");
      expect(output).toContain("powercfg.exe");
      expect(output).toContain(action.schemeGuid);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("shows a localized fatal screen and preserves a failing exit code", () => {
    const root = mkdtempSync(join(tmpdir(), "tweakforge-fatal-ja-"));
    try {
      const batchPath = join(root, "fatal ja.bat");
      const wrapperPath = join(root, "launch.bat");
      const generated = generateBatch(DEFAULT_PROJECT);
      const instrumented = generated.replace(RUNTIME_GUARD_ANCHOR, "goto engine_failed");
      expect(instrumented).not.toBe(generated);
      writeFileSync(batchPath, instrumented, "utf8");
      writeFileSync(wrapperPath, [
        "@echo off",
        "chcp 932 >nul",
        `(echo X)|call "${batchPath}" --tweakforge-utf8 --lang ja`,
        "exit /b %errorlevel%",
        "",
      ].join("\r\n"), "ascii");
      const result = spawnSync("cmd.exe", ["/d", "/v:off", "/c", wrapperPath], {
        encoding: "utf8",
        timeout: 30_000,
        windowsHide: true,
      });
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      expect(result.status, output).toBe(1);
      expect(output).not.toMatch(/not recognized|認識されていません|�/iu);
      expect(output).toContain("[ERROR] 内部処理エンジンを準備できませんでした。");
      expect(output).toContain("何かキーを押すと終了します...");
      expect(output).not.toContain("プロファイル");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
