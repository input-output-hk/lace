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
    ignores: ['tsdown.config.ts', 'dist/**'],
  },
);
