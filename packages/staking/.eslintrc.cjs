module.exports = {
  extends: ['./eslint.base.js'],
  overrides: [
    {
      files: ['.eslintrc.cjs'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      files: ['src/**/*.d.ts', 'tsup.config.ts', 'vitest.config.ts', '*.stories.{ts,tsx}'],
      rules: {
        'import/no-default-export': 'off',
        'react/no-multi-comp': 0,
      },
    },
  ],
  parserOptions: {
    project: 'tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    'import/order': 'off',
    'typescript-sort-keys/interface': 'off',
    'typescript-sort-keys/string-enum': 'off',
  },
};
