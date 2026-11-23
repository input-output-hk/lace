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
  module: {
    rules: [
      {
        test: /[\\/]@midnightntwrk[\\/]wallet-sdk-indexer-client[\\/]dist[\\/]effect[\\/]DeflateWebSocket\.js$/,
        use: [
          path.join(__dirname, '..', 'midnight-indexer-transport-loader.js'),
        ],
      },
    ],
  },
  plugins: [
    new DefinePlugin({
      'process.env.MAESTRO_URL_MAINNET': JSON.stringify(
        process.env.MAESTRO_URL_MAINNET ||
          process.env.EXPO_PUBLIC_MAESTRO_URL_MAINNET ||
          '',
      ),
      'process.env.MAESTRO_URL_TESTNET': JSON.stringify(
        process.env.MAESTRO_URL_TESTNET ||
          process.env.EXPO_PUBLIC_MAESTRO_URL_TESTNET ||
          '',
      ),
      'process.env.MEMPOOLSPACE_URL_MAINNET': JSON.stringify(
        process.env.MEMPOOLSPACE_URL_MAINNET ||
          process.env.EXPO_PUBLIC_MEMPOOLSPACE_URL_MAINNET ||
          '',
      ),
      'process.env.MEMPOOLSPACE_URL_TESTNET': JSON.stringify(
        process.env.MEMPOOLSPACE_URL_TESTNET ||
          process.env.EXPO_PUBLIC_MEMPOOLSPACE_URL_TESTNET ||
          '',
      ),
      'process.env.COINGECKO_API_BASE_URL': JSON.stringify(
        process.env.COINGECKO_API_BASE_URL ||
          process.env.EXPO_PUBLIC_COINGECKO_API_BASE_URL ||
          '',
      ),
      'process.env.STEELSWAP_API_BASE_URL': JSON.stringify(
        process.env.STEELSWAP_API_BASE_URL ||
          process.env.EXPO_PUBLIC_STEELSWAP_API_BASE_URL ||
          '',
      ),
      'process.env.NFT_CDN_URL': JSON.stringify(
        process.env.NFT_CDN_URL || process.env.EXPO_PUBLIC_NFT_CDN_URL || '',
      ),
      'process.env.CARDANO_CUBE_BASE_URL': JSON.stringify(
        process.env.CARDANO_CUBE_BASE_URL ||
          process.env.EXPO_PUBLIC_CARDANO_CUBE_BASE_URL ||
          '',
      ),
    }),
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
