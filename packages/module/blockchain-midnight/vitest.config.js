import path from 'path';

import { defineConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.base.config';

const walletSdkNodeModules = path.resolve(
  __dirname,
  '../../../node_modules/@midnight-ntwrk/wallet-sdk/node_modules/@midnight-ntwrk',
);

export default defineConfig({
  ...baseConfig,
  resolve: {
    alias: {
      '@midnight-ntwrk/wallet-sdk-shielded': `${walletSdkNodeModules}/wallet-sdk-shielded`,
      '@midnight-ntwrk/wallet-sdk-unshielded-wallet': `${walletSdkNodeModules}/wallet-sdk-unshielded-wallet`,
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
