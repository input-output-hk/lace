import { defineConfig } from 'eslint/config';

import rootConfig from '../../../eslint.config.mjs';

export default defineConfig(
  rootConfig,
  {
    files: ['**/*.{js,jsx,ts,tsx,mts,cts,mjs,cjs}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // scripts/ is the esbuild build tooling that produces the host's vendored
  // bundle (ADR 37) — node build scripts + browser shims, not part of the
  // type-checked src surface; excluded from typed linting like dist/coverage.
  {
    ignores: ['node_modules', 'dist', 'coverage', 'scripts'],
  },
);
