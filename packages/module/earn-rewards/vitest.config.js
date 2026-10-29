import { defineConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.base.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    // 'node', not 'jsdom': the suite resolves a real GOVERNANCE_CENTER
    // payload, and the SDK's DRep-id reducer rejects jsdom's cross-realm
    // Buffers — it would drop every configured DRep.
    environment: 'node',
    coverage: {
      ...baseConfig.test.coverage,
      reportsDirectory: __dirname + '/coverage',
    },
    include: [__dirname + '/**/*.test.ts'],
  },
});
