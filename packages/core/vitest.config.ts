import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Coverage configuration is ready but requires `@vitest/coverage-v8` to be
    // installed (devDependency). Run via `pnpm test:coverage` once it's added.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/**/*.d.ts'],
      thresholds: {
        // Numbers are aspirational — adjust after the first real run.
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
})
