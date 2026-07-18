import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  publicDir: "assets",
  test: {
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
