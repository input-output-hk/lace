const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
