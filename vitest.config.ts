import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: [
      "packages/*/src/**/*.test.ts",
      "apps/*/src/**/*.test.ts",
      "scripts/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      include: [
        "packages/*/src/**/*.ts",
        "apps/*/src/**/*.ts",
        "scripts/**/*.ts",
      ],
      exclude: [
        "packages/*/src/**/*.test.ts",
        "apps/*/src/**/*.test.ts",
        "scripts/**/*.test.ts",
        "apps/*/src/index.ts",
        "apps/*/src/log.ts",
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
})
