const { merge } = require('webpack-merge');

const {
  baseConfig,
  outputDirectory,
} = require('../base/common.webpack.config');

module.exports = merge(baseConfig, {
  mode: 'development',
  devtool: 'source-map',
  watchOptions: {
    ignored: ['**/node_modules', outputDirectory],
  },
});
