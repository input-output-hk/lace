import tseslint from 'typescript-eslint';

import rootConfig from '../../../eslint.config.mjs  ';

export default tseslint.config(...rootConfig, {
  files: ['**/*.{js,jsx,ts,tsx,mts,cts,mjs,cjs}'],
  languageOptions: {
    parserOptions: {
      project: './tsconfig.eslint.json',
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
