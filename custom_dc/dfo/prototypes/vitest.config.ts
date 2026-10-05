import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    // Mirror the tsconfig "@/*" alias so tests can import like the app does.
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    // Default to the fast node environment for pure-logic suites. Component tests
    // opt into jsdom per file with `// @vitest-environment jsdom`.
    environment: 'node',
    include: ['**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
