import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "client", "src") } },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    reporters: ["default"],
    testTimeout: 15_000,
  },
});
