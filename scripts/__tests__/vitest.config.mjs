import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Scope discovery to this directory so a bare `vitest run` from the repo root
// does not scan the whole monorepo — the harness owns only its own `*.test.mjs`.
const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    root: rootDir,
    include: ['**/*.test.mjs'],
    environment: 'node',
    // Each case builds a throwaway git repo and runs the checker as a child
    // process; the default 5s budget is too tight for that fixture setup.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
