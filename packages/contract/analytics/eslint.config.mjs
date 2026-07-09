import { defineConfig } from 'eslint/config';

import rootConfig from '../../../eslint.config.mjs';

export default defineConfig(
  rootConfig,
  // Package specific config
  {
    files: ['**/*.{js,jsx,ts,tsx,mts,cts,mjs,cjs}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Explicit ignore for the generated file
  {
    ignores: ['**/generate-analytics-events.mjs'],
  },
);
