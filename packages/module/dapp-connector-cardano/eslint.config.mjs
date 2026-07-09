import { defineConfig } from 'eslint/config';

import rootConfig from '../../../eslint.config.mjs';

export default defineConfig(rootConfig, {
  // Note: do NOT include *.mjs here. This config enables TS type-aware linting
  // via `parserOptions.project`, and scripts/*.mjs is intentionally not part of
  // the TS project.
  files: ['**/*.{js,jsx,ts,tsx,mts,cts,cjs}'],
  languageOptions: {
    parserOptions: {
      project: './tsconfig.eslint.json',
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
