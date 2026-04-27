import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.base.config';

export default defineConfig({
  ...baseConfig,
  resolve: {
    alias: {
      '@scure/bip39/wordlists/english.js': resolve(
        __dirname,
        '../../../node_modules/@scure/bip39/wordlists/english.js',
      ),
    },
  },
  test: {
    ...baseConfig.test,
    coverage: {
      ...baseConfig.test.coverage,
      reportsDirectory: __dirname + '/coverage',
    },
    include: [__dirname + '/**/*.test.ts'],
  },
});
