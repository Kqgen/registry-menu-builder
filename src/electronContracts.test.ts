import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

interface TextContracts {
  readonly MAX_TEXT_CHARS: number;
  readonly validClipboardContent: (content: unknown) => boolean;
  readonly validSaveRequest: (request: unknown) => boolean;
}

const require = createRequire(import.meta.url);
const contracts = require("../electron/text-contracts.cjs") as TextContracts;

describe("Electron text contracts", () => {
  it("accepts generated text beyond the former boundary", () => {
    const content = "x".repeat(16_777_217);
    expect(contracts.MAX_TEXT_CHARS).toBe(32 * 1_048_576);
    expect(contracts.validClipboardContent(content)).toBe(true);
    expect(contracts.validSaveRequest({ filename: "large.bat", content, type: "text/plain" })).toBe(true);
  });

  it("rejects text beyond the current boundary", () => {
    const content = "x".repeat(contracts.MAX_TEXT_CHARS + 1);
    expect(contracts.validClipboardContent(content)).toBe(false);
    expect(contracts.validSaveRequest({ filename: "large.bat", content, type: "text/plain" })).toBe(false);
  });
});
