const path = require('path');
const { merge } = require('webpack-merge');

const commonProdConfig = require('./webpack.common.prod');
const commonSwConfig = require('./webpack.common.sw');

require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
});

module.exports = () =>
  merge(commonProdConfig(), commonSwConfig(), {
    optimization: {
      splitChunks: {
        maxSize: 4000000,
        cacheGroups: {
          medium: {
            // sums up to ~2.7M
            test: /[/\\]node_modules[/\\](@cardano-sdk|posthog-js|rxjs|react-dom|pouchdb|@sentry|@sentry-internal)[\\/]/,
            enforce: true,
            priority: -10,
            chunks: 'async',
            reuseExistingChunk: true
          },
          emurgo: {
            test: /[/\\]node_modules[/\\]@emurgo[\\/]/,
            enforce: true,
            priority: -11,
            chunks: 'async',
            reuseExistingChunk: true
          },
          cf: {
            test: /[/\\]node_modules[/\\]@cardano-foundation[\\/]/,
            enforce: true,
            priority: -12,
            chunks: 'async',
            reuseExistingChunk: true
          },
          trezor: {
            test: /[/\\]node_modules[/\\]@trezor[\\/]/,
            enforce: true,
            priority: -13,
            chunks: 'async',
            reuseExistingChunk: true
          },
          sodium: {
            test: /[/\\]node_modules[/\\]libsodium-sumo[\\/]/,
            enforce: true,
            priority: -14,
            chunks: 'async',
            reuseExistingChunk: true
          },
          antd: {
            test: /[/\\]node_modules[/\\]antd[\\/]/,
            enforce: true,
            priority: -15,
            chunks: 'async',
            reuseExistingChunk: true
          },
          // sums up to ~2.45M; this might break the 3M limit if we add new dependencies
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
