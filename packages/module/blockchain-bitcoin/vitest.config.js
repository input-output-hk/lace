import path from 'path';

import { defineConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.base.config';

export default defineConfig({
  ...baseConfig,
  resolve: {
    alias: {
      '@lace-lib/ui-toolkit': path.resolve(
        __dirname,
        '../../../packages/lib/util-dev/test/__mocks__/@lace-lib/ui-toolkit.js',
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
