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
// because it needs a different loader for WASM
module.exports = () =>
  merge(commonConfig(), {
    entry: {
      background: withMaybeSentry(path.join(__dirname, 'src/lib/scripts/background/index.ts')),
      content: path.join(__dirname, 'src/lib/scripts/background/content.ts'),
      inject: path.join(__dirname, 'src/lib/scripts/background/inject.ts')
    },
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
