import { defineConfig } from 'eslint/config';

import rootConfig from '../../../eslint.config.mjs';

export default defineConfig(
  // Apply root config first
  ...rootConfig,
  // Config for SRC files
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: false,
        projectService: true, // Use project service
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Config for TEST files
  {
    files: ['src/**/*.{ts,tsx}', 'test/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: false,
        projectService: {
          allowDefaultProject: ['test/*.{ts,tsx}', 'eslint.config.mjs'],
          defaultProject: 'tsconfig.test.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
      'functional/no-classes': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
    },
    ignores: ['node_modules', 'dist', 'coverage', 'docs/typedoc'],
  },
  // The common subpath's tests are more than the default project takes.
  {
    files: ['test/common/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: './tsconfig.test.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // The common subpath is ported from cardano-js-sdk, which was written to
  // its own conventions: classes, loops, mutation and thrown errors. The rules
  // below encode the platform's style rather than correctness, so they stay
  // off for it instead of rewriting the port.
  {
    files: ['src/common/**/*.ts', 'test/common/**/*.ts'],
    rules: {
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/member-ordering': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-type-alias': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/prefer-enum-initializers': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/prefer-readonly': 'off',
      '@typescript-eslint/promise-function-async': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/switch-exhaustiveness-check': 'off',
      'functional/functional-parameters': 'off',
      'functional/immutable-data': 'off',
      'functional/no-expression-statements': 'off',
      'functional/no-let': 'off',
      'functional/no-loop-statements': 'off',
      'functional/no-mixed-types': 'off',
      'functional/no-return-void': 'off',
      'functional/no-throw-statements': 'off',
      'functional/prefer-immutable-types': 'off',
      'functional/prefer-tacit': 'off',
      'functional/readonly-type': 'off',
      'lodash/import-scope': 'off',
      'max-params': 'off',
      'prefer-arrow-functions/prefer-arrow-functions': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/expiring-todo-comments': 'off',
      'unicorn/filename-case': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-negated-condition': 'off',
      'unicorn/no-null': 'off',
      'unicorn/prevent-abbreviations': 'off',
    },
  },
  // The ported doc comments are upstream's, carried verbatim into
  // @laceio/cardano's declarations; they are JSDoc, not TSDoc.
  {
    files: ['src/common/**/*.ts'],
    rules: {
      'tsdoc/syntax': 'off',
    },
  },
);
