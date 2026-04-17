import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    typecheck: {
      enabled: true,
      include: ['src/**/*.{test-d,type-test}.{ts,tsx}'],
    },
  },
});
