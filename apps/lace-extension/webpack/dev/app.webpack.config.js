const CopyPlugin = require('copy-webpack-plugin');
const { merge } = require('webpack-merge');

const appConfig = require('../base/app.webpack.config');
const { outputDirectory } = require('../base/common.webpack.config');
const { transformManifest } = require('../webpack-utils');

const commonConfig = require('./common.webpack.config');

// eslint-disable-next-line no-console
console.log(' ');
// eslint-disable-next-line no-console
console.log(
  'Running app in dev mode. Default Midnight testnet network id is set to:',
  process.env.DEFAULT_MIDNIGHT_TESTNET_NETWORK_ID,
);
// eslint-disable-next-line no-console
console.log(' ');

module.exports = merge(commonConfig, appConfig, {
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'assets/manifest.json',
          to: outputDirectory,
          transform: content => transformManifest(content, 'development'),
        },
      ],
    }),
  ],
});
