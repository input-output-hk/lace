import { defineConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.base.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    // 'node', not 'jsdom': the suite runs the real TransactionBuilder, whose
    // blake2b hashing rejects jsdom's cross-realm Buffers.
    environment: 'node',
    coverage: {
      ...baseConfig.test.coverage,
      reportsDirectory: __dirname + '/coverage',
    },
    include: [__dirname + '/**/*.test.ts', __dirname + '/**/*.test.tsx'],
  },
});
