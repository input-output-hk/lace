const { getJestConfig } = require('@storybook/test-runner');

// The default Jest configuration comes from @storybook/test-runner
const testRunnerConfig = getJestConfig();

/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  ...testRunnerConfig,
  reporters: [
    'default',
    ['jest-ctrf-json-reporter', {}],
    [
      'jest-allure2-reporter',
      {
        resultsDir: 'allure-results',
        testCase: {
          fullName: ({ testCase }) => testCase.fullName,
          displayName: ({ testCase }) => testCase.fullName,
        },
      },
    ],
  ],
  testEnvironmentOptions: {
    ...testRunnerConfig.testEnvironmentOptions,
    'jest-playwright': {
      ...testRunnerConfig.testEnvironmentOptions?.['jest-playwright'],
      contextOptions: {
        ...testRunnerConfig.testEnvironmentOptions?.['jest-playwright']?.[
          'contextOptions'
        ],
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
  },
  /** Add your own overrides below, and make sure
   *  to merge testRunnerConfig properties with your own
   * @see https://jestjs.io/docs/configuration
   */
};
