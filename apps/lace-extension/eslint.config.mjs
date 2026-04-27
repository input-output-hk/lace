import tseslint from 'typescript-eslint';

import rootConfig from '../../eslint.config.mjs';

export default tseslint.config(
  rootConfig,
  {
    files: ['**/eslint.config.mjs'],
    languageOptions: {
      parserOptions: {
        project: false,
        projectService: false,
      },
    },
  },

  // Webpack files override
  {
    files: ['webpack/**/*'],
    rules: {
      '@typescript-eslint/no-require-imports': ['off'],
      '@typescript-eslint/no-var-requires': ['off'],
      '@typescript-eslint/explicit-function-return-type': ['off'],
      'functional/immutable-data': ['off'],
      'unicorn/prefer-module': ['off'],
      '@typescript-eslint/no-unsafe-argument': ['off'],
      '@typescript-eslint/no-unsafe-assignment': ['off'],
      '@typescript-eslint/no-unsafe-call': ['off'],
      '@typescript-eslint/no-unsafe-return': ['off'],
      '@typescript-eslint/no-unsafe-member-access': ['off'],
    },
    extends: [tseslint.configs.disableTypeChecked],
  },

  // Test files override - disable type checking
  {
    files: ['**/*.test.ts', '**/test/**/*.ts'],
    ...tseslint.configs.disableTypeChecked,
  },

  // Parser options and ignores
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
        allowAutomaticSingleRunInference: true,
      },
    },
  },
  {
    ignores: ['build/**/*', 'dist/**/*', 'storybook-static', 'scripts/**/*'],
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
