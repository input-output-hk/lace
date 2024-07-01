module.exports = {
  env: {
    node: true,
  },
  extends: ['prettier', 'plugin:typescript-sort-keys/recommended'],
  overrides: [
    {
      files: ['rollup.config.mjs'],
      rules: {
        'import/no-default-export': 'off',
        'import/no-extraneous-dependencies': 'off',
      },
    },
    {
      files: ['vitest.config.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
  parserOptions: {
    extraFileExtensions: ['.cjs', '.mjs', '.js'],
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['sort-keys', 'typescript-sort-keys'],
  rules: {
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
    curly: ['error', 'multi-line'],
    'import/no-default-export': 'error',
    'import/no-extraneous-dependencies': 'error',
    'import/no-unresolved': 'off',
    'import/order': [
      'error',
      {
        alphabetize: {
          caseInsensitive: true,
          order: 'asc',
        },
        groups: ['external', 'type', 'internal', 'parent', 'sibling', 'index'],
      },
    ],
    'no-unused-vars': ['error', { varsIgnorePattern: 'React' }],
    'promise/avoid-new': 'off',
    'react/jsx-curly-brace-presence': 'error',
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
