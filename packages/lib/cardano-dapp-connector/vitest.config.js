import { defineConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.base.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    environment: 'jsdom',
    setupFiles: [__dirname + '/test/setup.ts'],
    testTimeout: 12_000,
    coverage: {
      ...baseConfig.test.coverage,
      reportsDirectory: __dirname + '/coverage',
    },
    include: [__dirname + '/test/**/*.test.ts'],
  },
});
