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
  {
    // no-console off: test/sweep is a dev-run CLI whose console output is its
    // result.
    files: ['test/sweep/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
);
