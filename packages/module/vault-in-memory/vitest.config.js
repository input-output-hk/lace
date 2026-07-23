import { defineConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.base.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    coverage: {
      ...baseConfig.test.coverage,
      reportsDirectory: __dirname + '/coverage',
    },
    setupFiles: [__dirname + '/test/setup-argon2.ts'],
    include: [__dirname + '/**/*.test.ts'],
  },
});
