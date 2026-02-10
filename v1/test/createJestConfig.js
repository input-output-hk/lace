/* eslint-disable @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-var-requires */

const { jestEsmExceptions } = require('./jestEsmExceptions.js');

// Modules, that are loaded in esm versions and require explicit transformation
const esmExceptions = jestEsmExceptions([
  'style-inject',
  'tslib',
  '@cardano-ogmios',
  'nanoid',
  'rxjs',
  'esm-browser',
  'uuid',
  '@react-rxjs',
  'dexie',
  '@rxstate/core',
  'intersection-observer-polyfill',
  'p-retry',
  'p-debounce',
  'react-icons',
  'bip32',
  'openpgp'
]);

const rootDir = process.cwd();

const createJestConfig = (jestConfig) => {
  const transformIgnorePatterns = jestConfig.transformIgnorePatterns || [];

  return {
    rootDir,
    preset: 'ts-jest',
    ...jestConfig,
    // Limit workers in CI to avoid OOM on self-hosted runners (many CPUs → many workers → high memory)
    ...(process.env.CI && { maxWorkers: 4 }),
    transform: {
      ...jestConfig.transform,
      ...esmExceptions.transform,
      '^.+\\.(ts|tsx)$': [
        'ts-jest',
        {
          tsconfig: `${rootDir}/src/tsconfig.json`
        }
      ]
    },
    transformIgnorePatterns: [...transformIgnorePatterns, ...esmExceptions.transformIgnorePatterns]
  };
};

module.exports = { createJestConfig, esmExceptions };
