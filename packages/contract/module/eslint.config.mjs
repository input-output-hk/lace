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
  // This package is the source of truth for `@lace-contract/module` augmentation
  // targets (Action, AppConfig, LaceAddons, SideEffectDependencies, State) and is
  // exempt from the workspace-wide ban on these top-level names.
  {
    files: ['src/types.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
);
