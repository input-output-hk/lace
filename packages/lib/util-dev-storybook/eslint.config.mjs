import { defineConfig } from 'eslint/config';

import rootConfig, {
  hugeiconsBarrelBans,
  storybookUserEventBan,
} from '../../../eslint.config.mjs';

export default defineConfig(...rootConfig, {
  files: ['**/*.{js,jsx,ts,tsx,mts,cts,mjs,cjs}'],
  languageOptions: {
    parserOptions: {
      project: './tsconfig.eslint.json',
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    // Re-includes the barrel bans: this entry replaces the workspace-wide one.
    'no-restricted-imports': [
      'error',
      { paths: [...hugeiconsBarrelBans, ...storybookUserEventBan] },
    ],
  },
});
