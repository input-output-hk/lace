const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
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
      mangleExports: false,
      minimize: true,
      moduleIds: 'named',
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
      },
      minimizer: [
        new TerserPlugin({
          exclude: /(node_modules)/,
          minify: TerserPlugin.swcMinify,
          // the following options are passed to SWC https://swc.rs/docs/configuration/minification
          // Only enable what we need to speedup the build process
          terserOptions: {
            compress: {
              drop_console: false,
              drop_debugger: true,
              unused: false,
              arrows: false,
              booleans: false,
              collapse_vars: false,
              comparisons: false,
              computed_props: false,
              conditionals: false,
              defaults: false,
              directives: false,
              evaluate: false,
              hoist_props: false,
              if_return: false,
              join_vars: false,
              loops: false,
              negate_iife: false,
              properties: false,
              sequences: false,
              side_effects: false,
              switches: false,
              toplevel: false,
              typeofs: false
            },
            mangle: {
              keepFnNames: true,
              // Required for extension messaging, as it ends up using different mangled
              // class name for the same class in service worker and UI scripts
              keep_classnames: true
            }
          }
        })
      ]
    }
  });
