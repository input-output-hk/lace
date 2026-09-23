import { coverageConfigDefaults, defineConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.base.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    coverage: {
      ...baseConfig.test.coverage,
      reportsDirectory: __dirname + '/coverage',
      exclude: [...coverageConfigDefaults.exclude, 'src/acc/generated/**'],
    },
    include: [__dirname + '/**/*.test.ts'],
  },
});
