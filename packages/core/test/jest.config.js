const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../src/tsconfig');
const { createJestConfig } = require('../../../test/createJestConfig');

module.exports = createJestConfig({
  moduleNameMapper: {
    '.*\\.(scss|sass|css|less)$': '<rootDir>/test/__mocks__/styleMock.js',
    '.*\\.(jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2)$': '<rootDir>/test/__mocks__/fileMock.js',
    '^[.]*(?!.*\\.component\\.svg$).*\\.svg*$': '<rootDir>/test/__mocks__/fileMock.js',
    'component\\.svg(\\?v=\\d+\\.d+\\.\\d+)?$': '<rootDir>/test/__mocks__/svgMock.js',
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/src' })
  },
  roots: ['<rootDir>/src'],
  testTimeout: 60000,
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'src/ui/components/**/*.{ts,tsx}',
    'src/ui/hooks/**/*.{ts,tsx}',
    'src/ui/lib/**/*.{ts,tsx}',
    'src/ui/utils/**/*.{ts,tsx}',
    'src/wallet/**/*.{ts,tsx}'
  ],
  setupFilesAfterEnv: ['./test/jest.setup.js', 'jest-canvas-mock']
});
