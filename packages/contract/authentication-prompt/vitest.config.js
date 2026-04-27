import path from 'path';

import { defineConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.base.config';

export default defineConfig({
  ...baseConfig,
  resolve: {
    alias: [
      // Mock expo modules that require native code - using array format for exact matching
      {
        find: /^expo-modules-core(\/.*)?$/,
        replacement: path.resolve(
          __dirname,
          'test/__mocks__/expo-modules-core.ts',
        ),
      },
      {
        find: /^expo-secure-store$/,
        replacement: path.resolve(
          __dirname,
          'test/__mocks__/expo-secure-store.ts',
        ),
      },
    ],
  },
  test: {
    ...baseConfig.test,
    environment: 'jsdom',
    coverage: {
      ...baseConfig.test.coverage,
      reportsDirectory: __dirname + '/coverage',
    },
    include: [__dirname + '/**/*.test.ts'],
    setupFiles: [path.resolve(__dirname, 'test/setup.ts')],
    server: {
      deps: {
        // Force inline processing for packages that may have native dependencies
        inline: [/expo-.*/],
      },
    },
  },
});
