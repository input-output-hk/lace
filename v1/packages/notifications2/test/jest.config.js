const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions: srcCompilerOptions } = require('../src/tsconfig');
const { createJestConfig } = require('../../../test/createJestConfig');

const rootDir = process.cwd();

const baseConfig = createJestConfig({
  moduleNameMapper: {
    ...pathsToModuleNameMapper(srcCompilerOptions.paths, { prefix: '<rootDir>/src' })
  },
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testTimeout: 60_000,
  testEnvironment: 'node'
});

// Override transform to use different tsconfig for test files
module.exports = {
  ...baseConfig,
  transform: {
    ...baseConfig.transform,
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: (path) => {
          // Use test tsconfig for files in test directory, src tsconfig for files in src directory
          if (path.includes('/test/')) {
            return `${rootDir}/test/tsconfig.json`;
          }
          return `${rootDir}/src/tsconfig.json`;
        }
      }
    ]
  }
};
