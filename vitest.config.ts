import { defineConfig } from 'vitest/config';

// Pure-logic tests run in node: the Plotting Table reducer (web/src/plotting) is framework-free,
// and the Worker libs (src/lib) are too. Browser/DOM islands are not unit-tested here.
export default defineConfig({
  test: {
    include: [
      'tests/**/*.test.ts',
      'src/**/*.test.ts',
      'web/src/**/*.test.ts',
      'web/tests/**/*.test.ts',
    ],
    environment: 'node',
  },
});
