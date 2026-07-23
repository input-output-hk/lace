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
  // ADR 37: core admits the trusted SDK surface only through the @lace-lib/vendor
  // seam — never @cardano-sdk/@midnight-ntwrk directly. Keeps core framework-free
  // and vendor the single audit chokepoint for the privileged host bundle.
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@cardano-sdk',
                '@cardano-sdk/*',
                '@midnight-ntwrk',
                '@midnight-ntwrk/*',
              ],
              message:
                'Import the trusted SDK surface through @lace-lib/vendor (ADR 37). @lace-lib/core must not depend on @cardano-sdk/@midnight-ntwrk directly — add the symbol to the vendor seam instead.',
            },
          ],
        },
      ],
    },
  },
  // ADR 37 / scripts/check-shared-lib-purity.mjs: core ships as first-party SOURCE into
  // the privileged host, so its shipped code must not reach for an external runtime
  // global either — Buffer comes from the @lace-lib/vendor seam, not the ambient global.
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'Buffer',
          message:
            'Import Buffer from @lace-lib/vendor (ADR 37) — core must not rely on the ambient Buffer global.',
        },
        {
          name: 'process',
          message:
            'core must not rely on the ambient process global (ADR 37) — route any runtime need through @lace-lib/vendor.',
        },
      ],
    },
  },
);
