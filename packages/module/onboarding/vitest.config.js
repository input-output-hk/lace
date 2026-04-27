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
    include: [__dirname + '/test/**/*.test.ts'],
    // Exclude hook tests
    exclude: [
      __dirname + '/test/hooks/**/*.test.ts',
      __dirname + '/**/*.test.tsx',
    ],
  },
});
