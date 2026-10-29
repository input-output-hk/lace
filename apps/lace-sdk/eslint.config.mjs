import { defineConfig } from 'eslint/config';

import rootConfig from '../../eslint.config.mjs';

export default defineConfig(
  ...rootConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: false,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Minimal test infra for the CardanoLazyInMemorySignerFactory probe --
    // `projectService` above only covers `src/**`, so `test/**` needs its own
    // project reference to a tsconfig that actually includes it (mirrors the
    // `tsconfig.eslint.json` convention used by other packages, e.g.
    // vault-keystone).
    files: ['test/**/*.{ts,tsx}', 'scripts/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // These fixtures exercise the published subpaths instead of internal imports.
    files: [
      'test/cardano-consumer-entry*.mjs',
      'test/bitcoin-consumer-entry*.mjs',
    ],
    rules: {
      '@nx/enforce-module-boundaries': 'off',
    },
  },
  {
    ignores: [
      'tsdown.config.ts',
      'dist/**',
      'dist-canary/**',
      'test/cardano-consumer-types*.mts',
      'test/bitcoin-consumer-types*.mts',
      'test/midnight-consumer-types.mts',
      'test/experimental-consumer-types*.mts',
    ],
  },
);
