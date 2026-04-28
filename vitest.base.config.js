export const baseConfig = {
  test: {
    coverage: {
      reporter: ['text', 'lcov'],
      reporterOptions: {
        lcov: {},
      },
    },
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
};
