const path = require('path');
const { merge } = require('webpack-merge');
const commonConfig = require('./webpack.common');
require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
});

const withMaybeSentry = (p) => ('SENTRY_DSN' in process.env ? [path.join(__dirname, 'sentry.js'), p] : p);

// service worker script (background.ts) needs a separate webpack config,
// because it needs a different loader for WASM, as well as 'webworker' target for dynamic script imports
module.exports = () =>
  merge(commonConfig(), {
    entry: {
      background: withMaybeSentry(path.join(__dirname, 'src/lib/scripts/background/index-sw.ts'))
    },
    output: {
      path: path.join(__dirname, 'dist/sw'),
      filename: '[name].js',
      chunkFilename: '[name].chunk.js',
      // the following setting is required for SRI to work:
      crossOriginLoading: 'anonymous'
    },
    // The background script in Firefox is a hidden DOM page, so target is web
    target: process.env.BROWSER === 'firefox' ? 'web' : 'webworker',
    module: {
      // configuration regarding modules
      rules: [
        {
          test: /\.wasm$/,
          type: 'javascript/auto',
          use: {
            loader: 'webassembly-loader-sw',
            options: {
              export: 'instance',
              importObjectProps: `'./cardano_message_signing_bg.js': __webpack_require__("../../node_modules/@emurgo/cardano-message-signing-browser/cardano_message_signing_bg.js")`
            }
          }
        }
      ]
    }
  });
