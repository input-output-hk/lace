import { defineConfig } from 'vitest/config';

import { baseConfig } from '../../vitest.base.config';

export default defineConfig({
  ...baseConfig,
  plugins: [
    {
      name: 'mock-react-native',
      enforce: 'pre',
      resolveId: id => {
        if (id === 'react-native') return '\0react-native';
      },
      load: id => {
        if (id === '\0react-native') return 'export default {};';
      },
    },
  ],
  define: {
    __DEV__: true,
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
