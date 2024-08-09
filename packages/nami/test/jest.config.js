const { esmExceptions } = require('../../../test/createJestConfig.js');

const rootDir = process.cwd();
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: process.cwd(),
  transformIgnorePatterns: esmExceptions.transformIgnorePatterns,
  transform: {
    ...esmExceptions.transform,
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        diagnostics: false,
        tsconfig: `${rootDir}/src/tsconfig.json`,
      },
    ],
  },
};
