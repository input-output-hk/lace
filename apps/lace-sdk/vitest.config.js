import { resolve } from 'node:path';

import { coverageConfigDefaults, defineConfig } from 'vitest/config';

import { baseConfig } from '../../vitest.base.config';

import { CARDANO_SUBPATHS } from './scripts/laceio-cardano.mjs';

export default defineConfig({
  ...baseConfig,
  resolve: {
    alias: [
      {
        find: '@scure/bip39/wordlists/english.js',
        replacement: resolve(
          __dirname,
          '../../node_modules/@scure/bip39/wordlists/english.js',
        ),
      },
      // The tests run the domain layer the published SDK imports: each
      // @cardano-sdk package @laceio/cardano publishes resolves to its source
      // (scripts/laceio-cardano.mjs), as the bundle resolves it to the
      // package.
      ...[...CARDANO_SUBPATHS].map(subpath => ({
        find: new RegExp(`^@cardano-sdk/${subpath}$`),
        replacement: resolve(__dirname, `../lace-cardano/src/${subpath}.ts`),
      })),
    ],
  },
  test: {
    ...baseConfig.test,
    coverage: {
      ...baseConfig.test.coverage,
      reportsDirectory: __dirname + '/coverage',
      // CI builds canary bundles before this suite. Cover source, not those
      // generated bundles and their copied dependencies a second time.
      exclude: [...coverageConfigDefaults.exclude, '**/dist-canary/**'],
    },
    include: [__dirname + '/**/*.test.ts'],
    // Many of these tests run the TypeScript compiler over fixtures or the
    // workspace, which takes seconds when CI runs many projects at once.
    testTimeout: 30_000,
  },
});
