module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['lodash'],
  extends: [
    '@atixlabs/eslint-config/configurations/react',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript'
  ],
  settings: {
    'import/resolver': { typescript: { project: ['packages/*/src/tsconfig.json', 'apps/*/src/tsconfig.json'] } },
    // Fixes eslint not being able to detect react version
    react: { pragma: 'React', fragment: 'Fragment', version: 'detect' }
  },
  rules: {
    quotes: ['error', 'single', { avoidEscape: true }],
    'new-cap': ['error', { properties: false }],
    // needed for Cardano.*
    'unicorn/filename-case': 'off',
    'unicorn/prevent-abbreviations': 'off',
    'unicorn/prefer-object-from-entries': 'off',
    'unicorn/prefer-node-protocol': 'off',
    'unicorn/no-array-for-each': 'off',
    'unicorn/prefer-module': 'off',
    'unicorn/no-array-reduce': 'off',
    'promise/always-return': 'off',
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error'],
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': ['error'],
    'no-invalid-this': 0,
    'react/prop-types': 'off',
    'max-len': 'off', // prettier is already handling this automatically,
    '@typescript-eslint/no-explicit-any': ['error'],
    'no-console': ['error', { allow: ['warn', 'error', 'info', 'debug'] }],
    'lodash/import-scope': ['error', 'method'],
    'promise/avoid-new': 'off'
  },
  overrides: [
    {
      files: ['stories/desktop/**/*.stories.{ts,tsx}', 'stories/desktop/decorators/**'],
      rules: {
        'react/no-multi-comp': [0, { ignoreStateless: true }]
      }
    },
    {
      files: '**/*jest.config.js',
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      }
    },
    {
      // https://github.com/SonarSource/eslint-plugin-sonarjs/issues/176
      files: ['**/*.{test,integration,spec}.{ts,tsx}'],
      rules: {
        'sonarjs/no-duplicate-string': 'off'
      }
    }
  ]
};
