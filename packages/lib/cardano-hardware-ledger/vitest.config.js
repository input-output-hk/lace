import { defineConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.base.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    environment: 'node',
    // ledgerjs ships CommonJS whose enums Node's named-export detection
    // misses; vite's own transform exposes them.
    server: {
      deps: { inline: [/@cardano-foundation\/ledgerjs-hw-app-cardano/] },
    },
    testTimeout: 12_000,
    coverage: {
      ...baseConfig.test.coverage,
      reportsDirectory: __dirname + '/coverage',
    },
    include: [__dirname + '/test/**/*.test.ts'],
  },
});
