import { defineConfig } from 'eslint/config';

import rootConfig from '../../../eslint.config.mjs';
export default defineConfig(...rootConfig, {
  files: ['**/*.{ts,mjs,js}'],
  languageOptions: {
    parserOptions: {
      project: './tsconfig.eslint.json',
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: { 'functional/immutable-data': 'off', 'functional/no-let': 'off' },
});
