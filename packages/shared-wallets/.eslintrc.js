module.exports = {
  extends: [require('@lace/configs').laceEslintConfigPath],
  overrides: [
    {
      files: ['./rollup.config.mjs', './vitest.config.ts'],
      rules: {
        'import/no-default-export': 'off',
      },
    },
    {
      files: ['./.eslintrc.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      files: ['**/**/*.stories.{ts,tsx}'],
      rules: {
        'import/no-default-export': 'off',
        'react/no-multi-comp': 'off',
        'sonarjs/no-duplicate-string': 'off',
      },
    },
  ],
  parserOptions: {
    project: 'tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
};
