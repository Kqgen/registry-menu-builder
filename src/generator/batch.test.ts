import { describe, expect, it } from "vitest";
import { DEFAULT_PROJECT, DEFAULT_TWEAK } from "../domain/defaults.ts";
import { MAX_TWEAKS, type RegistryProject, type RegistryTweak } from "../domain/types.ts";
import { generateBatch, projectFilename } from "./batch.ts";
import { PAGE_SIZE } from "./batchUiLayout.ts";
import { consoleDisplayWidth } from "./consoleLayout.ts";
import { buildBootstrapEncodedCommand, buildElevationEncodedCommand } from "./powershell.ts";

function decodeEngine(batch: string): string {
  const lines = batch.split("\r\n");
  const start = lines.indexOf(":RB_ENGINE_BEGIN");
  const end = lines.indexOf(":RB_ENGINE_END");
  const payload = lines.slice(start + 1, end).map((line) => line.slice(1)).join("");
  const bytes = Uint8Array.from(atob(payload), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes.slice(3));
}

function decodeUtf16(value: string): string {
  const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  return new TextDecoder("utf-16le").decode(bytes);
}

function hostileProject(): RegistryProject {
  const hostile: RegistryTweak = {
    ...DEFAULT_TWEAK,
    label: "Name & echo PWN | more < bad > out (x) %PATH% !SAFE!",
    group: "O'Brien & Co",
    description: "Quotes ' and \" stay data",
    keyPath: "Software\\O'Brien & Co",
    valueName: "Value & Name",
    valueType: "REG_EXPAND_SZ",
    data: "%PATH% & literal ' text",
  };
  return {
    ...DEFAULT_PROJECT,
    title: "Tool & echo PWN | %PATH% !SAFE! (test)",
    subtitle: "Text < stays > visible ^ safely",
    tweaks: [hostile],
  };
}

describe("generateBatch", () => {
  it("builds a bilingual choice-driven framed menu", () => {
    const batch = generateBatch(DEFAULT_PROJECT);
    const bannerPayload = batch
      .split("\r\n")
      .filter((line) => line.startsWith('set "TF_BANNER=%TF_BANNER%'))
      .map((line) => line.slice('set "TF_BANNER=%TF_BANNER%'.length, -1))
      .join("");
    expect(batch).toContain("setlocal EnableExtensions DisableDelayedExpansion");
    expect(batch).toContain('if /i "%~1"=="--tweakforge-utf8" goto utf8_ready');
    expect(batch).toContain('set "TF_SELF=%~f0"');
    expect(decodeUtf16(buildBootstrapEncodedCommand())).toContain("& $env:TF_SELF '--tweakforge-utf8'");
    expect(batch).toMatch(/mode con: cols=\d+ lines=48/u);
    expect(batch).toContain("choice /c 12 /n /m \"LANGUAGE / 言語 > \"");
    expect(batch).toContain("choice /c 1ARPLQ");
    expect(batch).toContain(":menu_ja_001");
    expect(batch).toContain(":menu_en_001");
    expect(batch).toContain("プロファイル");
    expect(batch).toContain("TWEAK LIST");
    expect(batch).toContain("[A]  すべてのTweakを適用");
    expect(batch).toContain("[R]  Restore all saved values");
    expect(batch).toContain("[L]  表示言語を変更");
    expect(batch).toContain('-Language "%TF_LANG%"');
    expect(decodeUtf16(buildElevationEncodedCommand())).toContain("'--lang', $language");
    expect(batch).toContain(":RB_ENGINE_BEGIN");
    expect(batch).not.toContain("set /p");
    expect(batch.split("\r\n")).not.toContain("pause");
    expect(batch).not.toMatch(/[▓░]/u);
    expect(batch).not.toContain("Created By:");
    expect(batch).not.toContain("Disable Telemetry");
    expect(batch).not.toContain("FULL OPTIMIZATION");
    expect(bannerPayload.length).toBeGreaterThan(0);
    expect(bannerPayload.length).toBeLessThan(7000);
    for (const line of batch.split("\r\n").filter((candidate) => candidate.startsWith("echo(+"))) {
      expect(consoleDisplayWidth(line.slice(5))).toBe(118);
    }
    for (const line of batch.split("\r\n").filter((candidate) => candidate.startsWith("echo(^|"))) {
      expect(consoleDisplayWidth(line.slice(5).replaceAll("^", ""))).toBe(118);
    }
  });

  it("keeps every Unicode banner style out of direct CMD parsing", () => {
    for (const bannerStyle of ["apex", "drift", "ghost"] as const) {
      const batch = generateBatch({ ...DEFAULT_PROJECT, bannerStyle });
      expect(batch).not.toMatch(/[█▀▄▓░◆╵╶└╷│┃┌├╴┘─━┴┐┤┬┼╱╲]/u);
    }
  });

  it("contains elevation, state, logging and reversible action wiring", () => {
    const batch = generateBatch(DEFAULT_PROJECT);
    const engine = decodeEngine(batch);
    expect(batch).toContain("fltmc >nul 2>&1");
    expect(decodeUtf16(buildElevationEncodedCommand())).toContain("-Verb RunAs");
    expect(batch).toContain(".tweakforge-state");
    expect(engine).toContain("Export-Clixml -LiteralPath $temporary");
    expect(engine).toContain("DoNotExpandEnvironmentNames");
    expect(engine).toContain("Assert-State $state $Entry");
    expect(engine).toContain("Backup tweak ID mismatch.");
    expect(engine).toContain("$mutex.WaitOne(30000)");
    expect(engine).toContain("Remove-Item -LiteralPath $stateFile -Force");
    expect(engine.indexOf("Move-Item -LiteralPath $temporary")).toBeLessThan(
      engine.indexOf("$key.SetValue($Entry.ValueName, $Entry.Data, $kind)"),
    );
  });

  it("keeps accepted metacharacters inert and registry payload inside the engine", () => {
    const batch = generateBatch(hostileProject());
    const engine = decodeEngine(batch);
    expect(batch).toContain("title Tool ^& echo PWN ^| %%PATH%% !SAFE! ^(test^)");
    expect(batch).toContain("Name ^& echo PWN ^| more ^< bad ^> out ^(x^) %%PATH%% !SAFE!");
    expect(engine).toContain("KeyPath='Software\\O''Brien & Co'");
    expect(engine).toContain("Data='%PATH% & literal '' text'");
    expect(batch).not.toMatch(/^echo PWN/gmu);
  });

  it("emits unique labels and resolves every static jump target", () => {
    const tweaks = Array.from({ length: MAX_TWEAKS }, (_, index): RegistryTweak => ({
      ...DEFAULT_TWEAK,
      id: `item_${index.toString().padStart(3, "0")}`,
      valueName: `Value${index}`,
    }));
    const executable = generateBatch({ ...DEFAULT_PROJECT, tweaks }).split("\r\n").slice(0, -1);
    const payloadStart = executable.indexOf(":RB_ENGINE_BEGIN");
    const lines = executable.slice(0, payloadStart + 1);
    const labels = lines
      .filter((line) => /^:[a-z0-9_]+$/iu.test(line))
      .map((line) => line.slice(1).toLowerCase());
    const targets = lines.flatMap((line) =>
      [...line.matchAll(/\b(?:goto\s+:?|call\s+:)([a-z0-9_]+)/giu)].map((match) => (match[1] ?? "").toLowerCase()),
    ).filter((target) => target !== "eof");
    expect(new Set(labels).size).toBe(labels.length);
    expect(targets.filter((target) => !labels.includes(target))).toEqual([]);
  });

  it("uses a fixed PowerShell capability set", () => {
    const engine = decodeEngine(generateBatch(DEFAULT_PROJECT));
    for (const denied of [
      "Invoke-Expression",
      "ScriptBlock",
      "Invoke-WebRequest",
      "Start-BitsTransfer",
      "bcdedit",
      "sc.exe",
    ]) {
      expect(engine).not.toContain(denied);
    }
    expect(engine).toContain("[ValidateSet('Apply','Restore','RestorePoint')]");
    expect(engine).toContain("[ValidatePattern('^[a-z][a-z0-9_]{2,47}$')]");
  });

  it("supports the full item limit with bounded physical lines and pagination", () => {
    const data = "x".repeat(2000);
    const tweaks = Array.from({ length: MAX_TWEAKS }, (_, index): RegistryTweak => ({
      ...DEFAULT_TWEAK,
      id: `item_${index.toString().padStart(2, "0")}`,
      label: `Entry ${index}`,
      valueName: `Value${index}`,
      valueType: "REG_SZ",
      data,
    }));
    const batch = generateBatch({ ...DEFAULT_PROJECT, tweaks });
    const lastPage = Math.ceil(MAX_TWEAKS / PAGE_SIZE).toString().padStart(3, "0");
    expect(batch).toContain(`:menu_${lastPage}`);
    expect(batch).toContain(`:menu_ja_${lastPage}`);
    expect(batch).toContain(`:menu_en_${lastPage}`);
    const longestLine = batch
      .split("\r\n")
      .reduce((longest, line) => Math.max(longest, line.length), 0);
    expect(longestLine).toBeLessThan(7901);
  });
});

describe("projectFilename", () => {
  it("removes path characters and Windows reserved names", () => {
    expect(projectFilename({ ...DEFAULT_PROJECT, title: "CON" }, "bat")).toBe("gaming-tweaks.bat");
    expect(projectFilename({ ...DEFAULT_PROJECT, title: "NUL.backup" }, "bat")).toBe("gaming-tweaks.bat");
    expect(projectFilename({ ...DEFAULT_PROJECT, title: "bad:/name* " }, "json")).toBe("bad--name-.json");
  });
});
