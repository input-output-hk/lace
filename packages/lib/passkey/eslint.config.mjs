import { defineConfig } from 'eslint/config';

import rootConfig, { hugeiconsBarrelBans } from '../../../eslint.config.mjs';

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
  // A hosted signer page bundles this lib on its own, so it must stay free
  // of the Cardano SDK's dependency closure: each of these imports pulls
  // the Cardano SDK in.
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // Re-included: this entry replaces the workspace-wide one.
          paths: hugeiconsBarrelBans,
          patterns: [
            {
              group: [
                '@lace-lib/util',
                '@lace-lib/util/*',
                '@lace-lib/core',
                '@lace-lib/core/*',
                '@lace-lib/vendor',
                '@lace-lib/vendor/*',
                '@cardano-sdk',
                '@cardano-sdk/*',
              ],
              message:
                'The passkey and crypto libs must stay free of the Cardano SDK dependency closure so a hosted signer page can bundle them on their own.',
            },
          ],
        },
      ],
    },
  },
);
