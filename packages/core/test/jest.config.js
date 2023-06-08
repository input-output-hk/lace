const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../src/tsconfig');
const { jestEsmExceptions } = require('../../../test/jestEsmExceptions');

//Modules, that are loaded in esm versions and require explicit transformation
const esmExceptions = jestEsmExceptions(['style-inject', 'tslib']);

const rootDir = process.cwd();

module.exports = {
  rootDir,
  moduleNameMapper: {
    '.*\\.(scss|sass|css|less)$': '<rootDir>/test/__mocks__/styleMock.js',
    '.*\\.(jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2)$': '<rootDir>/test/__mocks__/fileMock.js',
    '\\.svg': '<rootDir>/test/__mocks__/svgMock.js',
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/src' })
  },
  preset: 'ts-jest',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.test.ts?$': 'ts-jest',
    '^.+\\.test.tsx?$': 'ts-jest',
    ...esmExceptions.transform
  },
  transformIgnorePatterns: esmExceptions.transformIgnorePatterns,
  testTimeout: 60000,
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'src/ui/components/**/*.{ts,tsx}',
    'src/ui/hooks/**/*.{ts,tsx}',
    'src/ui/lib/**/*.{ts,tsx}',
    'src/ui/utils/**/*.{ts,tsx}',
    'src/wallet/**/*.{ts,tsx}'
  ],
  setupFilesAfterEnv: ['./test/jest.setup.js', 'jest-canvas-mock'],
  globals: {
    'ts-jest': {
      tsconfig: './src/tsconfig.json'
    }
  }
};
