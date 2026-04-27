const path = require('node:path');

const CopyPlugin = require('copy-webpack-plugin');

const { outputDirectory } = require('./common.webpack.config');

require('dotenv-defaults').config({
  path: path.join(__dirname, '..', '.env'),
  encoding: 'utf8',
  defaults: path.join(__dirname, '..', '.env.defaults'),
});

module.exports = {
  entry: {
    'isolated-script': path.join(
      __dirname,
      '..',
      '..',
      'src/content-scripts/isolated-script.ts',
    ),
    'injected-script': path.join(
      __dirname,
      '..',
      '..',
      'src/content-scripts/injected-script.ts',
    ),
    'ledger-usb-picker': path.join(
      __dirname,
      '..',
      '..',
      'src/ledger-usb-picker.ts',
    ),
  },
  output: {
    // required for content scripts
    publicPath: `chrome-extension://${process.env.EXTENSION_ID}/js/`,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'assets/img', to: path.join(outputDirectory, 'img') },
        {
          from: 'assets/html/ledger-usb-picker.html',
          to: path.join(outputDirectory, 'ledger-usb-picker.html'),
        },
        {
          // @trezor/connect-webextension bridges postMessage between its
          // popup (connect.trezor.io/9/*) and our service worker. The
          // package ships the prebuilt content script; we wire it up via
          // the manifest content_scripts entry for the same URL pattern.
          from: require.resolve(
            '@trezor/connect-webextension/build/content-script.js',
          ),
          to: path.join(outputDirectory, 'js', 'trezor-content-script.js'),
        },
      ],
    }),
  ],
};
