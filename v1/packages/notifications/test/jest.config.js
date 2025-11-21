const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions: srcCompilerOptions } = require('../src/tsconfig');
const { createJestConfig } = require('../../../test/createJestConfig');

const rootDir = process.cwd();

const baseConfig = createJestConfig({
  moduleNameMapper: {
    '.*\\.(scss|sass|css|less)$': '<rootDir>/test/__mocks__/styleMock.js',
    '.*\\.(jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2)$': '<rootDir>/test/__mocks__/fileMock.js',
    '^[.]*(?!.*\\.component\\.svg$).*\\.svg*$': '<rootDir>/test/__mocks__/fileMock.js',
    'component\\.svg(\\?v=\\d+\\.d+\\.\\d+)?$': '<rootDir>/test/__mocks__/svgMock.js',
    ...pathsToModuleNameMapper(srcCompilerOptions.paths, { prefix: '<rootDir>/src' })
  },
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testTimeout: 60000,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./test/jest.setup.js', 'jest-canvas-mock']
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
