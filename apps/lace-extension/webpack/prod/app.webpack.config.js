const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { merge } = require('webpack-merge');

const appConfig = require('../base/app.webpack.config');
const { outputDirectory } = require('../base/common.webpack.config');
const { transformManifest } = require('../webpack-utils');

const baseConfig = require('./common.webpack.config');
const { hasSentryReleaseConfig, baseSentryConfig } = require('./sentry-config');

module.exports = merge(baseConfig, appConfig, {
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'assets/manifest.json',
          to: outputDirectory,
          transform: content => transformManifest(content, 'production'),
        },
      ],
    }),
    ...(hasSentryReleaseConfig
      ? [
          sentryWebpackPlugin({
            ...baseSentryConfig,
            sourcemaps: {
              filesToDeleteAfterUpload: ['dist/js/*.js.map'],
            },
          }),
        ]
      : []),
  ],
});
