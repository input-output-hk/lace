import { defineConfig } from 'eslint/config';

import rootConfig from '../../../eslint.config.mjs';

export default defineConfig(rootConfig, {
  files: ['**/*.{js,jsx,ts,tsx,mts,cts,mjs,cjs}'],
  languageOptions: {
    parserOptions: {
      project: './tsconfig.eslint.json',
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    // Extends the root allowList with 'Acc' (Account Custody Contract).
    'unicorn/prevent-abbreviations': [
      'error',
      {
        allowList: {
          Db: true,
          db: true,
          Doc: true,
          doc: true,
          Docs: true,
          docs: true,
          Props: true,
          props: true,
          args: true,
          Args: true,
          Ref: true,
          ref: true,
          Params: true,
          params: true,
          src: true,
          Src: true,
          Acc: true,
          acc: true,
        },
      },
    ],
  },
});
