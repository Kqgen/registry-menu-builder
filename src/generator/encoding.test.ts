import { describe, expect, it } from "vitest";
import { chunkBase64, encodeUtf16LeBase64, encodeUtf8BomBase64 } from "./encoding.ts";

function base64Bytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

describe("encoding", () => {
  it("encodes an EncodedCommand as UTF-16LE", () => {
    const source = "$value = '日本語 🚀'";
    const decoded = new TextDecoder("utf-16le").decode(base64Bytes(encodeUtf16LeBase64(source)));
    expect(decoded).toBe(source);
  });

  it("encodes an engine with a UTF-8 BOM", () => {
    const bytes = base64Bytes(encodeUtf8BomBase64("日本語"));
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3))).toBe("日本語");
  });

  it("chunks without changing a payload", () => {
    const payload = "A".repeat(241);
    const chunks = chunkBase64(payload, 96);
    expect(chunks.join("")).toBe(payload);
    expect(chunks.every((chunk) => chunk.length <= 96)).toBe(true);
  });
});
