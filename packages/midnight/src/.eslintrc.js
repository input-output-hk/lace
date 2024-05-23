module.exports = {
  extends: ['../../../.eslintrc.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname
  },
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 0,
    'no-console': 'off'
  }
};
