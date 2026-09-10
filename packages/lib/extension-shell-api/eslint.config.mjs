import { defineConfig } from 'eslint/config';

import rootConfig from '../../../eslint.config.mjs';

export default defineConfig(
  ...rootConfig,
  {
    files: ['**/*.{js,jsx,ts,tsx,mts,cts,mjs,cjs}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // ADR 37 / scripts/check-shared-lib-purity.mjs: the host↔guest API contract ships as
  // first-party SOURCE into the privileged host — no external runtime global either.
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'Buffer',
          message:
            'extension-shell-api must not rely on the ambient Buffer global (ADR 37) — route runtime needs through @lace-lib/vendor.',
        },
        {
          name: 'process',
          message:
            'extension-shell-api must not rely on the ambient process global (ADR 37).',
        },
      ],
    },
  },
);
