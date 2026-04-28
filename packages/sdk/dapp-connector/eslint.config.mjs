import tseslint from 'typescript-eslint';

import rootConfig from '../../../eslint.config.mjs';

export default tseslint.config(
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
      'unicorn/filename-case': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'functional/no-classes': 'off',
      'functional/prefer-property-signatures': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/member-ordering': 'off',
      '@typescript-eslint/prefer-enum-initializers': 'off',
      '@nx/enforce-module-boundaries': 'off',
    },
    ignores: ['node_modules', 'dist', 'coverage', 'docs/typedoc'],
  },
);
