// eslint-disable-next-line unicorn/prefer-module
module.exports = exports = {
  plugins: ['wdio'],
  extends: [
    'eslint:recommended',
    'plugin:wdio/recommended'
  ],
  rules: {
    'new-cap': ['error', { capIsNew: false }],
    'no-magic-numbers': ['off'],
    'wdio/no-pause': ['off'],
    '@typescript-eslint/no-explicit-any': ['off'],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'error'
  },
  'env': {
    'node': true
  }
};
