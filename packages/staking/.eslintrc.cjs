module.exports = {
  env: {
    node: true,
  },
  extends: ['prettier'],
  overrides: [
    {
      files: ['src/**/*.d.ts', 'tsup.config.ts', 'vitest.config.ts', '*.stories.{ts,tsx}'],
      rules: {
        'import/no-default-export': 'off',
        'react/no-multi-comp': 0,
      },
    },
  ],
  parserOptions: {
    extraFileExtensions: ['.cjs', '.mjs'],
    project: 'tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['sort-keys'],
  rules: {
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
    curly: ['error', 'multi-line'],
    'import/no-default-export': 'error',
    'import/no-extraneous-dependencies': 2,
    'import/no-unresolved': 'off',
    'import/order': [
      'error',
      {
        alphabetize: {
          caseInsensitive: true,
          order: 'asc',
        },
        groups: ['builtin', 'external', 'type', 'internal', 'parent', 'sibling', 'index'],
      },
    ],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            importNames: ['sx', 'style', 'recipe', 'vars', 'LocalThemeProvider'],
            message: "Please import from 'features/theme' or directly e.g. '@vanilla-extract/css'.",
            name: '@lace/ui',
          },
        ],
      },
    ],
    'promise/avoid-new': 'off',
    'react/jsx-curly-brace-presence': 2,
    'react/jsx-handler-names': 'off',
    'react/react-in-jsx-scope': 'off',
    'sort-imports': [
      'error',
      {
        ignoreDeclarationSort: true,
      },
    ],
    'sort-keys/sort-keys-fix': ['error', 'asc', { natural: true }],
    'unicorn/no-null': 'off',
    'unicorn/prefer-query-selector': 'off',
  },
};
