import { defineConfig } from 'eslint/config';

import rootConfig, {
  hugeiconsBarrelBans,
  passportFlowBoundaryBans,
} from '../../../eslint.config.mjs';

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
    rules: {
      // Extends the root allowList with 'Acc' (Account Custody Contract)
      // and 'dev' (the development-only authoriser).
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
            Dev: true,
            dev: true,
          },
        },
      ],
    },
  },
  // The flow layer is platform neutral so it can move upstream to the
  // Passport SDK unchanged: no rxjs, no redux, no module contract, and no
  // import from the store layer, which consumes the flows and not the
  // other way round.
  {
    files: ['src/flows/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // Re-included: this entry replaces the workspace-wide one.
          paths: hugeiconsBarrelBans,
          patterns: passportFlowBoundaryBans,
        },
      ],
    },
  },
  {
    // compact-generated Account Custody Contract module; vendored, never
    // hand-edited, so it is not held to the workspace lint rules.
    ignores: ['src/acc/generated/**'],
  },
);
