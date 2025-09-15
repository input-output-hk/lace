const { merge } = require('webpack-merge');
const commonProdConfig = require('./webpack.common.prod');
const commonCsConfig = require('./webpack.common.cs');

require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
});

module.exports = () =>
  merge(commonProdConfig(), commonCsConfig(), {
    optimization: {
      splitChunks: {
        maxSize: 4000000,
        cacheGroups: {
          vendors: {
            test: /[/\\]node_modules[/\\]/,
            enforce: true,
            priority: -20,
            chunks: 'async',
            reuseExistingChunk: true
          }
        }
      }
    }
  });
