import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "client", "src") } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    reporters: ["default"],
    coverage: { enabled: false },
  },
});
