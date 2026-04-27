const path = require('node:path');

const { version } = require(path.join(
  __dirname,
  '..',
  '..',
  'assets',
  'manifest.json',
));

const hasSentryReleaseConfig =
  !!process.env.SENTRY_AUTH_TOKEN &&
  !!process.env.SENTRY_ORG &&
  !!process.env.SENTRY_PROJECT_ID;

const baseSentryConfig = {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT_ID,
  release: { name: version },
  telemetry: false,
  url: 'https://sentry.io/',
};

module.exports = {
  hasSentryReleaseConfig,
  baseSentryConfig,
};
