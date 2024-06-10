module.exports = {
  extends: [require('@lace/configs').laceEslintConfigPath],
  overrides: [
    {
      files: ['./.eslintrc.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
  parserOptions: {
    project: 'tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
};
