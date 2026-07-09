import { defineConfig } from 'eslint/config';

import rootConfig from '../../../eslint.config.mjs  ';

export default defineConfig(...rootConfig, {
  files: ['**/*.{js,jsx,ts,tsx,mts,cts,mjs,cjs}'],
  languageOptions: {
    parserOptions: {
      project: './tsconfig.eslint.json',
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
