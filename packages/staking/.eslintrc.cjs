module.exports = {
  extends: [require('@lace/configs').laceEslintConfigPath],
  parserOptions: {
    project: 'tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
};
