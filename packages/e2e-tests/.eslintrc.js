// eslint-disable-next-line unicorn/prefer-module
module.exports = exports = {
  plugins: ['wdio'],
  extends: ['eslint:recommended', 'plugin:wdio/recommended'],
  rules: {
    'new-cap': ['error', { capIsNew: false }],
    'no-magic-numbers': ['off'],
    'wdio/no-pause': ['off'],
    '@typescript-eslint/no-explicit-any': ['off'],
    'unicorn/no-await-expression-member': ['off']
  },
  env: {
    node: true
  }
};
