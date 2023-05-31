const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../src/tsconfig');
const { jestEsmExceptions } = require('../../../test/jestEsmExceptions');

const rootDir = process.cwd();
//Modules, that are loaded in esm versions and require explicit transformation
const esmExceptions = jestEsmExceptions([
  'style-inject',
  'tslib',
  '@cardano-ogmios',
  'nanoid',
  'rxjs',
  'esm-browser',
  'uuid'
]);

module.exports = {
  rootDir,
  moduleNameMapper: {
    '.*\\.(scss|sass|css|less)$': '<rootDir>/test/__mocks__/styleMock.js',
    '.*\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)$': '<rootDir>/test/__mocks__/fileMock.js',
    '^lodash-es$': 'lodash',
    '^webextension-polyfill': '<rootDir>/test/__mocks__/fileMock.js',
    // https://github.com/LedgerHQ/ledger-live/issues/763
    '@ledgerhq/devices/hid-framing': '@ledgerhq/devices/lib/hid-framing',
    // TODO update uuid and retest; https://github.com/uuidjs/uuid/issues/451
    uuid: require.resolve('uuid'),
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
    'src/ui/util/**/*.{ts,tsx}',
    'src/wallet/**/*.{ts,tsx}',
    '!src/wallet/**/mock.ts'
  ],
  setupFilesAfterEnv: ['./test/jest.setup.js', 'jest-canvas-mock'],
  globals: {
    'ts-jest': {
      tsconfig: './src/tsconfig.json'
    }
  }
};
