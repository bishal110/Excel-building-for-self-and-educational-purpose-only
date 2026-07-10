import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.ts', 'src/io/**/*.ts', 'src/ui/state/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
});
