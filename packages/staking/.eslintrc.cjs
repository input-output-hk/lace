module.exports = {
  env: {
    node: true,
  },
  extends: ['prettier'],
  overrides: [
    {
      files: ['src/**/*.d.ts', 'tsup.config.ts', 'vitest.config.ts', '.ladle/*.*', '*.stories.{ts,tsx}'],
      rules: {
        'import/no-default-export': 'off',
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
    'promise/avoid-new': 'off',
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
