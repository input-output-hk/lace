import { resolve } from 'path';

import { defineConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.base.config';

export default defineConfig({
  ...baseConfig,
  resolve: {
    alias: {
      'expo-modules-core': resolve(
        __dirname,
        'test/__mocks__/expo-modules-core.ts',
      ),
      'expo-secure-store': resolve(
        __dirname,
        'test/__mocks__/expo-secure-store.ts',
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
