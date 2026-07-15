import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_PROJECT, DEFAULT_TWEAK } from "../domain/defaults.ts";
import type { RegistryProject } from "../domain/types.ts";
import { buildPowerShellEngine } from "./powershell.ts";

function parseWithWindowsPowerShell(source: string): { readonly status: number | null; readonly output: string } {
  const parser = [
    "$source=[Console]::In.ReadToEnd()",
    "$tokens=$null",
    "$errors=$null",
    "[void][System.Management.Automation.Language.Parser]::ParseInput($source,[ref]$tokens,[ref]$errors)",
    "if($errors.Count -gt 0){$errors|ForEach-Object{$_.ToString()}|Write-Error;exit 1}",
  ].join(";");
  const result = spawnSync(
    "powershell.exe",
    ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", parser],
    { input: source, encoding: "utf8", windowsHide: true },
  );
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
  };
}

describe("PowerShell engine syntax", () => {
  it("parses the default generated engine without executing it", () => {
    const result = parseWithWindowsPowerShell(buildPowerShellEngine(DEFAULT_PROJECT));
    expect(result.status, result.output).toBe(0);
  });

  it("parses hostile quoted and Unicode registry constants as data", () => {
    const project: RegistryProject = {
      ...DEFAULT_PROJECT,
      title: "日本語 ' toolkit",
      tweaks: [
        {
          ...DEFAULT_TWEAK,
          keyPath: "Software\\O'Brien & Co",
          valueName: "Value ' %PATH%",
          valueType: "REG_MULTI_SZ",
          data: "one's value\n日本語 & data",
        },
      ],
    };
    const result = parseWithWindowsPowerShell(buildPowerShellEngine(project));
    expect(result.status, result.output).toBe(0);
  });

  it("parses every registry kind and delete operation in one engine", () => {
    const kinds = [
      ["REG_SZ", "text"],
      ["REG_EXPAND_SZ", "%PATH%"],
      ["REG_MULTI_SZ", "one\ntwo"],
      ["REG_BINARY", "00,7f,ff"],
      ["REG_DWORD", "4294967295"],
      ["REG_QWORD", "18446744073709551615"],
    ] as const;
    const project: RegistryProject = {
      ...DEFAULT_PROJECT,
      tweaks: [
        ...kinds.map(([valueType, data], index) => ({
          ...DEFAULT_TWEAK,
          id: `kind_${index}`,
          valueName: `Value${index}`,
          valueType,
          data,
        })),
        {
          ...DEFAULT_TWEAK,
          id: "delete_item",
          valueName: "RemovedValue",
          operation: "delete" as const,
          data: "not parsed for delete",
        },
      ],
    };
    const result = parseWithWindowsPowerShell(buildPowerShellEngine(project));
    expect(result.status, result.output).toBe(0);
  });

  it("handles a missing backup as a registry-free restore no-op", () => {
    const root = mkdtempSync(join(tmpdir(), "registry-menu-engine-"));
    try {
      const enginePath = join(root, "engine.ps1");
      const logPath = join(root, "actions.log");
      writeFileSync(enginePath, `\ufeff${buildPowerShellEngine(DEFAULT_PROJECT)}`, "utf8");
      const result = spawnSync(
        "powershell.exe",
        [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          enginePath,
          "-Action",
          "Restore",
          "-TweakId",
          DEFAULT_TWEAK.id,
        ],
        {
          encoding: "utf8",
          windowsHide: true,
          env: { ...process.env, RB_STATE: root, RB_LOG: logPath },
        },
      );
      expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
      const log = readFileSync(logPath, "utf8");
      expect(log).toContain("\tRestore\tNO_BACKUP");
      expect(log).toContain("\tRestore\tOK");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects a snapshot bound to another tweak before registry access", () => {
    const root = mkdtempSync(join(tmpdir(), "registry-menu-engine-"));
    try {
      const enginePath = join(root, "engine.ps1");
      const statePath = join(root, `${DEFAULT_TWEAK.id}.clixml`);
      const logPath = join(root, "actions.log");
      writeFileSync(enginePath, `\ufeff${buildPowerShellEngine(DEFAULT_PROJECT)}`, "utf8");
      const setup = [
        `$state=[pscustomobject]@{Schema=1;ProjectId='${DEFAULT_PROJECT.projectId}';TweakId='another_item';Hive='HKCU';KeyPath='Wrong';ValueName='Wrong';KeyExists=$false;ValueExists=$false;Kind=$null;Data=$null}`,
        "$state|Export-Clixml -LiteralPath $env:STATE_FILE",
      ].join(";");
      const setupResult = spawnSync(
        "powershell.exe",
        ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", setup],
        {
          encoding: "utf8",
          windowsHide: true,
          env: { ...process.env, STATE_FILE: statePath },
        },
      );
      expect(setupResult.status, `${setupResult.stdout}${setupResult.stderr}`).toBe(0);
      const result = spawnSync(
        "powershell.exe",
        [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          enginePath,
          "-Action",
          "Restore",
          "-TweakId",
          DEFAULT_TWEAK.id,
        ],
        {
          encoding: "utf8",
          windowsHide: true,
          env: { ...process.env, RB_STATE: root, RB_LOG: logPath },
        },
      );
      expect(result.status).toBe(1);
      expect(`${result.stdout}${result.stderr}`).toContain("Backup tweak ID mismatch.");
      expect(readFileSync(logPath, "utf8")).toContain("\tRestore\tFAIL");
      const state = new TextDecoder("utf-16le").decode(readFileSync(statePath).subarray(2));
      expect(state).toContain("another_item");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
