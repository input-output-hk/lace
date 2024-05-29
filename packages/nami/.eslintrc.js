const path = require('node:path');

module.exports = {
  $schema: 'https://json.schemastore.org/eslintrc.json',
  root: true,
  extends: [
    'plugin:react/recommended',
    'plugin:unicorn/recommended',
    'plugin:storybook/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:@typescript-eslint/strict',
    'plugin:functional/external-typescript-recommended',
    'plugin:functional/lite',
    'plugin:functional/stylistic',
    'prettier',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.eslint.json'],
    tsconfigRootDir: path.resolve(__dirname),
  },
  plugins: [
    'eslint-plugin-import',
    'prefer-arrow-functions',
    '@typescript-eslint',
    'functional',
    'prettier',
  ],
  settings: {
    // Fixes eslint not being able to detect react version
    react: { pragma: 'React', fragment: 'Fragment', version: 'detect' },
  },
  rules: {
    'unicorn/filename-case': 0,
    'max-params': ['error', 2],
    'no-void': 'off',
    'prettier/prettier': 'error',
    'import/no-default-export': 'error',
    'react/no-multi-comp': 'error',
    'prefer-arrow-functions/prefer-arrow-functions': 'error',
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'object',
          'type',
        ],
        pathGroups: [
          {
            pattern: 'react',
            group: 'builtin',
          },
          {
            pattern: 'react',
            group: 'builtin',
          },
          {
            pattern: '@storybook/**',
            group: 'external',
          },
        ],
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
        'newlines-between': 'always',
        pathGroupsExcludedImportTypes: ['react'],
      },
    ],
    'unicorn/prevent-abbreviations': [
      'error',
      {
        allowList: {
          Props: true,
          props: true,
          args: true,
          vars: true,
          createVar: true,
          ref: true,
        },
        replacements: {
          s: {
            currentState: true,
          },
        },
      },
    ],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/consistent-type-exports': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      {
        accessibility: 'explicit',
        overrides: {
          parameterProperties: 'no-public',
        },
      },
    ],
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/member-ordering': 'error',
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variable',
        types: ['boolean'],
        format: ['PascalCase'],
        prefix: ['is', 'should', 'has', 'can', 'did', 'will'],
      },
    ],
    '@typescript-eslint/no-confusing-void-expression': 'error',
    '@typescript-eslint/no-redundant-type-constituents': 'error',
    '@typescript-eslint/no-require-imports': 'error',
    '@typescript-eslint/no-type-alias': [
      'off',
      {
        allowGenerics: 'always',
        allowAliases: 'always',
        allowMappedTypes: 'in-unions-and-intersections',
      },
    ],
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/prefer-enum-initializers': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/promise-function-async': 'error',
    '@typescript-eslint/sort-type-constituents': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
    'functional/immutable-data': [
      'error',
      {
        ignoreAccessorPattern: [
          'draft.*',
          '**.parameters',
          '**.play',
          '**.argTypes',
          '**.args',
        ],
      },
    ],
    'functional/functional-parameters': 'off',
    'functional/no-mixed-types': 'off',
    'functional/no-return-void': 'off',
    'functional/no-expression-statements': 'off',
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['*design-system/*/*'],
            message: 'usage of design system private modules not allowed.',
          },
          {
            group: ['*design-tokens/*'],
            message: 'usage of design tokens private modules not allowed.',
          },
          {
            group: ['*types/*'],
            message: 'usage of types private modules not allowed.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: [
        'index.js',
        '.eslintrc.js',
        'rollup.config.js',
        '.storybook/*.js',
      ],
      rules: {
        'unicorn/prefer-module': ['off'],
        '@typescript-eslint/no-unsafe-assignment': ['off'],
        '@typescript-eslint/no-var-requires': ['off'],
        '@typescript-eslint/no-unsafe-call': ['off'],
        '@typescript-eslint/require-await': ['off'],
        '@typescript-eslint/no-require-imports': ['off'],
        'functional/no-expression-statements': ['off'],
        'functional/immutable-data': ['off'],
        '@typescript-eslint/strict-boolean-expressions': ['off'],
        '@typescript-eslint/explicit-module-boundary-types': ['off'],
        '@typescript-eslint/explicit-function-return-type': ['off'],
        'import/no-default-export': ['off'],
        '@typescript-eslint/no-unsafe-member-access': ['off'],
        '@typescript-eslint/no-unsafe-return': ['off'],
      },
    },
    {
      files: ['*.spec.tsx', '*.spec.ts'],
      rules: {
        'functional/no-expression-statements': ['off'],
        'functional/no-return-void': ['off'],
      },
    },
    {
      files: ['jest.config.js'],
      rules: {
        '@typescript-eslint/restrict-template-expressions': ['off'],
        '@typescript-eslint/no-unsafe-call': ['off'],
        'unicorn/prefer-module': ['off'],
        'functional/immutable-data': [
          'error',
          {
            ignorePattern: 'module.exports',
          },
        ],
      },
    },
    {
      files: ['src/**/*.stories.tsx'],
      rules: {
        'react/no-multi-comp': ['off'],
        'import/no-default-export': ['off'],
      },
    },
  ],
};
