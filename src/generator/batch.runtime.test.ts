import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { escapeBatchText } from "./batch.ts";

describe("batch display escaping", () => {
  it("prints accepted shell metacharacters as one inert line", () => {
    const root = mkdtempSync(join(tmpdir(), "registry-menu-batch-"));
    try {
      const batchPath = join(root, "display test.bat");
      const value = "A & echo PWN | more < input > output ^ caret %PATH% !SAFE! (group) ' \"";
      const batch = [
        "@echo off",
        "setlocal EnableExtensions DisableDelayedExpansion",
        `echo(${escapeBatchText(value)}`,
        "endlocal",
        "",
      ].join("\r\n");
      writeFileSync(batchPath, batch, "utf8");
      const result = spawnSync("cmd.exe", ["/d", "/v:off", "/c", batchPath], {
        encoding: "utf8",
        windowsHide: true,
      });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout.trim()).toBe(value);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("preserves metacharacters inside balanced and unmatched quotes", () => {
    const root = mkdtempSync(join(tmpdir(), "registry-menu-batch-"));
    try {
      const batchPath = join(root, "quoted display.bat");
      const values = [
        'A "inside & ^ | < > ( )" outside & ^ end',
        'unmatched " & ^ | < > ( ) tail',
        '" ^& " & echo PWN',
      ];
      const batch = [
        "@echo off",
        "setlocal EnableExtensions DisableDelayedExpansion",
        ...values.map((value) => `echo(${escapeBatchText(value)}`),
        "endlocal",
        "",
      ].join("\r\n");
      writeFileSync(batchPath, batch, "utf8");
      const result = spawnSync("cmd.exe", ["/d", "/v:off", "/c", batchPath], {
        encoding: "utf8",
        windowsHide: true,
      });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout.trim().split(/\r?\n/u)).toEqual(values);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
