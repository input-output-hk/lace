const path = require('path');
const { merge } = require('webpack-merge');
const commonConfig = require('./webpack.common');
require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: './.env.defaults'
});

// service worker script (background.ts) needs a separate webpack config,
// because it needs a different loader for WASM
module.exports = () =>
  merge(commonConfig(), {
    entry: {
      background: path.join(__dirname, 'src/lib/scripts/background/index.ts'),
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
              importObjectProps:
                // eslint-disable-next-line max-len
                `'./cardano_multiplatform_lib_bg.js': __webpack_require__("../../node_modules/@dcspark/cardano-multiplatform-lib-browser/cardano_multiplatform_lib_bg.js"),
               './cardano_message_signing_bg.js': __webpack_require__("../../node_modules/@emurgo/cardano-message-signing-browser/cardano_message_signing_bg.js")`
            }
          }
        }
      ]
    }
  });
