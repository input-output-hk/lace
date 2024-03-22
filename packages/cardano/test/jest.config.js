const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../src/tsconfig');
const { createJestConfig } = require('../../../test/createJestConfig');

const rootDir = process.cwd();

module.exports = createJestConfig({
  moduleNameMapper: {
    '.*\\.(scss|sass|css|less)$': '<rootDir>/test/__mocks__/styleMock.js',
    '.*\\.(jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2)$': '<rootDir>/test/__mocks__/fileMock.js',
    '^[.]*(?!.*\\.component\\.svg$).*\\.svg*$': '<rootDir>/test/__mocks__/fileMock.js',
    'component\\.svg(\\?v=\\d+\\.d+\\.\\d+)?$': '<rootDir>/test/__mocks__/svgMock.js',
    '^lodash-es$': 'lodash',
    '^webextension-polyfill': '<rootDir>/test/__mocks__/fileMock.js',
    // https://github.com/LedgerHQ/ledger-live/issues/763
    '@ledgerhq/devices/hid-framing': '@ledgerhq/devices/lib/hid-framing',
    // TODO update uuid and retest; https://github.com/uuidjs/uuid/issues/451
    uuid: require.resolve('uuid'),
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/src' })
  },
  roots: ['<rootDir>/src'],
  testTimeout: 60000,
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.stories.tsx',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types.ts',
    '!src/**/index.{ts,tsx}',
    '!src/wallet/test/mocks/*',
    // files bellow fails to collect coverage as they are not imported in the tests
    '!src/wallet/lib/config.ts',
    '!src/wallet/util/calculate-deposit-reclaim.ts',
    '!src/wallet/lib/get-total-minimum-coins.ts',
    '!src/wallet/lib/build-transaction-props.ts',
    '!src/wallet/util/observable.ts',
    '!src/wallet/lib/providers.ts',
    '!src/wallet/lib/set-missing-coins.ts',
    '!src/ui/components/Voting/CatalystRegisterStep.tsx',
    '!src/wallet/lib/hardware-wallet.ts',
    '!src/ui/components/Voting/CurrentCatalystFund.tsx',
    '!src/ui/components/Voting/DownloadCatalystStep.tsx',
    '!src/ui/components/Voting/VotingParticipation.tsx',
    '!src/ui/components/Voting/CatalystScanStep.tsx',
    '!src/ui/components/Voting/CatalystPinStep.tsx',
    '!src/ui/components/Voting/WaitForNextFundCard.tsx',
    '!src/ui/components/Voting/CatalystConfirmationStep.tsx'
  ],
  setupFilesAfterEnv: ['./test/jest.setup.js', 'jest-canvas-mock'],
  workerThreads: true
});
