import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_PROJECT } from "../domain/defaults.ts";
import { BANNER_STYLE_IDS, THEME_IDS } from "../domain/types.ts";
import { generateBatch } from "./batch.ts";

const MENU_GUARD_ANCHOR = 'set "RB_LOG=%RB_STATE%\\actions.log"';

describe("generated BAT console rendering", () => {
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
      expect(output).toContain("TWEAK PROFILE");
      expect(output).toContain("GAMING LOADOUT");
      expect(output).toContain("ファイル拡張子を表示");
      expect(output).toContain("LOADOUT COMMAND >");
      expect(output).toMatch(bannerStyle === "ghost" ? /[━┃╱╲◆]/u : /[█▀▄]/u);
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
      expect(output).toContain("TWEAK PROFILE");
      expect(output).toContain("LOADOUT COMMAND >");
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
      expect(output).toContain("TWEAK PROFILE");
      expect(output).toContain("ファイル拡張子を表示");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
