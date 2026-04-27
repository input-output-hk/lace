const path = require('node:path');

const { DefinePlugin, NormalModuleReplacementPlugin } = require('webpack');

const { withMaybeSentry } = require('../webpack-utils');

const { outputDirectory } = require('./common.webpack.config');

module.exports = {
  target: 'webworker',
  entry: {
    'sw-script': withMaybeSentry(
      path.join(__dirname, '..', '..', 'src/sw-script/index.ts'),
    ),
  },
  output: {
    path: path.join(outputDirectory, 'js', 'sw'),
    publicPath: process.env.WEBPACK_PUBLIC_PATH,
  },
  plugins: [
    // MV3 forbids remotely hosted code. @sentry/browser's lazyLoadIntegration
    // embeds "https://browser.sentry-cdn.com" even when unused — tree-shaking
    // doesn't drop it. Replace it with a stub so the string never ships.
    new NormalModuleReplacementPlugin(
      /[\\/]@sentry[\\/]browser[\\/].*[\\/]utils[\\/]lazyLoadIntegration\.js$/,
      path.join(__dirname, '..', 'sentry-lazy-load-stub.js'),
    ),
    ...(process.env.EXTRA_FEATURE_FLAGS
      ? [
          new DefinePlugin({
            'process.env.EXTRA_FEATURE_FLAGS': JSON.stringify(
              process.env.EXTRA_FEATURE_FLAGS,
            ),
          }),
        ]
      : []),
  ],
};
