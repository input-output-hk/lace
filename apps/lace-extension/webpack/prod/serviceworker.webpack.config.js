const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');
const { merge } = require('webpack-merge');

const swConfig = require('../base/serviceworker.webpack.config');

const baseConfig = require('./common.webpack.config');
const { hasSentryReleaseConfig, baseSentryConfig } = require('./sentry-config');

module.exports = merge(baseConfig, swConfig, {
  plugins: [
    ...(hasSentryReleaseConfig
      ? [
          sentryWebpackPlugin({
            ...baseSentryConfig,
            sourcemaps: {
              filesToDeleteAfterUpload: ['dist/js/sw/**/*.js.map'],
            },
          }),
        ]
      : []),
  ],
});
