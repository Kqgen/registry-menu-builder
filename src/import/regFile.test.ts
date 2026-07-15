import { describe, expect, it } from "vitest";
import { DEFAULT_PROJECT, DEFAULT_TWEAK } from "../domain/defaults.ts";
import { mergeImportedValues } from "../domain/import.ts";
import { validateProject } from "../domain/validation.ts";
import { parseRegFile } from "./regFile.ts";

function utf16Reg(value: string): Uint8Array {
  const bytes = new Uint8Array(2 + value.length * 2);
  bytes[0] = 0xff;
  bytes[1] = 0xfe;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    bytes[2 + index * 2] = code & 0xff;
    bytes[3 + index * 2] = code >> 8;
  }
  return bytes;
}

describe("parseRegFile", () => {
  it("imports multiple keys, default values, deletes, continuations and typed data", () => {
    const text = [
      "Windows Registry Editor Version 5.00",
      "",
      "[HKEY_CURRENT_USER\\Software\\GameTune]",
      '"FpsMode"=dword:00000001',
      '@="Enabled"',
      '"OldMode"=-',
      '"Bytes"=hex:01,02,\\',
      "  03,ff",
      '"Path"=hex(2):25,00,47,00,41,00,4d,00,45,00,25,00,00,00',
      '"Profiles"=hex(7):4c,00,6f,00,77,00,00,00,48,00,69,00,67,00,68,00,00,00,00,00',
      '"Counter"=hex(b):ff,ff,ff,ff,ff,ff,ff,ff',
      "",
    ].join("\r\n");
    const result = parseRegFile(utf16Reg(text), "gaming.reg");
    expect(result.values).toHaveLength(7);
    expect(result.values.find((value) => value.valueName === "FpsMode")).toMatchObject({ valueType: "REG_DWORD", data: "0x00000001" });
    expect(result.values.find((value) => value.valueName === "")).toMatchObject({ valueType: "REG_SZ", data: "Enabled" });
    expect(result.values.find((value) => value.valueName === "OldMode")).toMatchObject({ operation: "delete" });
    expect(result.values.find((value) => value.valueName === "Bytes")?.data).toBe("01 02 03 ff");
    expect(result.values.find((value) => value.valueName === "Path")?.data).toBe("%GAME%");
    expect(result.values.find((value) => value.valueName === "Profiles")?.data).toBe("Low\nHigh");
    expect(result.values.find((value) => value.valueName === "Counter")?.data).toBe("0xffffffffffffffff");
  });

  it("rejects whole-key deletion and unsupported value types", () => {
    const header = "Windows Registry Editor Version 5.00\r\n";
    expect(() => parseRegFile(utf16Reg(`${header}[-HKEY_CURRENT_USER\\Software\\Bad]`), "bad.reg")).toThrow("キー全体の削除");
    expect(() => parseRegFile(utf16Reg(`${header}[HKEY_CURRENT_USER\\Software\\Bad]\r\n\"X\"=hex(8):00`), "bad.reg")).toThrow("hex(8)");
  });

  it("rejects ambiguous legacy ANSI instead of silently corrupting text", () => {
    const prefix = new TextEncoder().encode("REGEDIT4\r\n[HKEY_CURRENT_USER\\Software\\GameTune]\r\n\"Name\"=\"");
    const bytes = Uint8Array.from([...prefix, 0x81, 0x22]);
    expect(() => parseRegFile(bytes, "legacy.reg")).toThrow("UTF-16LEまたはUTF-8");
  });
});

describe("mergeImportedValues", () => {
  it("updates matching data in place and appends new targets", () => {
    const imported = parseRegFile(utf16Reg([
      "Windows Registry Editor Version 5.00",
      `[HKEY_CURRENT_USER\\${DEFAULT_TWEAK.keyPath.toLowerCase()}]`,
      '"hidefileext"=dword:00000001',
      '@="default"',
    ].join("\r\n")), "merge.reg");
    const merged = mergeImportedValues(DEFAULT_PROJECT, imported.values);
    expect(merged.tweaks).toHaveLength(2);
    expect(merged.tweaks[0]).toMatchObject({
      id: DEFAULT_TWEAK.id,
      keyPath: DEFAULT_TWEAK.keyPath,
      valueName: DEFAULT_TWEAK.valueName,
      data: "0x00000001",
    });
    expect(merged.tweaks[1]?.valueName).toBe("");
    expect(validateProject(merged)).toEqual([]);
  });
});
