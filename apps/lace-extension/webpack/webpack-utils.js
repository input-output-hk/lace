const path = require('path');

require('dotenv-defaults').config({
  path: path.join(__dirname, '.env'),
  encoding: 'utf8',
  defaults: path.join(__dirname, '.env.defaults'),
});

const convertHttpToWebSocket = address =>
  address.replace(/(http)(s)?:\/\//, 'ws$2://');

const FONT_TYPEKIT_URL = 'https://use.typekit.net';

/**
 * Construct the connect-src for Sentry based on the DSN
 * https://docs.sentry.io/concepts/key-terms/dsn-explainer/
 *
 * @param dsn Data Source Name
 * @returns string Sentry connect-src
 */
const constructSentryConnectSource = dsn => {
  if (/https:\/\/[^@]+@([^/]+).*/.test(dsn))
    return dsn.replace(/https:\/\/[^@]+@([^/]+).*/, 'https://$1');
  return '';
};

const dedupeOrigins = urls =>
  [...new Set(urls.map(u => new URL(u).origin))].join(' ');

const transformManifest = (content, mode) => {
  const path = require('node:path');

  require('dotenv-defaults').config({
    path: path.join(__dirname, '.env'),
    encoding: 'utf8',
    defaults: path.join(__dirname, '.env.defaults'),
  });
  try {
    const manifest = JSON.parse(content.toString());
    manifest.name = manifest.name.replace(
      '$EXTENSION_NAME',
      process.env.EXTENSION_NAME,
    );

    manifest.content_security_policy.extension_pages =
      manifest.content_security_policy.extension_pages
        .replace(
          '$CARDANO_SERVICES_URLS',
          `${process.env.BLOCKFROST_URL_PREPROD} ${process.env.BLOCKFROST_URL_PREVIEW} ${process.env.BLOCKFROST_URL_MAINNET}`,
        )
        .replace(
          '$BITCOIN_SERVICES_URLS',
          dedupeOrigins([
            process.env.MAESTRO_URL_MAINNET,
            process.env.MAESTRO_URL_TESTNET,
            process.env.MEMPOOLSPACE_URL_TESTNET,
            process.env.MEMPOOLSPACE_URL_MAINNET,
          ]),
        )
        .replace(
          '$COINGECKO_API_URL',
          process.env.COINGECKO_API_BASE_URL
            ? `${process.env.COINGECKO_API_BASE_URL.replace(/\/$/, '')}/`
            : '',
        )
        .replace(
          '$MIDNIGHT_SERVICES',
          [
            'http://localhost:6300',
            'http://localhost:8088',
            'http://localhost:9944',
            'https://*.midnight.network',
          ]
            .flatMap(url => [url, convertHttpToWebSocket(url)])
            .join(' '),
        )
        .replace('$POSTHOG_API_URL', `${process.env.POSTHOG_API_URL}`)
        .replace(
          '$REDUX_DEVTOOLS_SERVER',
          mode === 'development' ? 'ws://localhost:8000' : '',
        )
        .replace(
          '$SENTRY_CONNECT_SRC',
          constructSentryConnectSource(process.env.SENTRY_DSN),
        )
        .replace(
          '$HANDLE_API_URL',
          'https://preview.api.handle.me https://api.handle.me',
        )
        .replace(
          '$LOCALHOST_DEFAULT_SRC',
          mode === 'development' ? 'http://localhost:3000' : '',
        )
        .replace(
          '$LOCALHOST_SCRIPT_SRC',
          mode === 'development' ? 'http://localhost:3000' : '',
        )
        .replace(
          '$REACT_DEVTOOLS_DEFAULT_SRC',
          mode === 'development' ? 'http://localhost:8097' : '',
        )
        .replace(
          '$REACT_DEVTOOLS_CONNECT_SRC',
          mode === 'development'
            ? 'http://localhost:8097 ws://localhost:8097'
            : '',
        )
        .replace(
          '$LOCALHOST_CONNECT_SRC',
          mode === 'development'
            ? 'http://localhost:3000 http://localhost:3001 http://localhost:8080 ws://localhost:3000 ws://0.0.0.0:3000/ws wss://localhost:3000  ws://localhost:3001 ws://0.0.0.0:3001/ws wss://localhost:3001'
            : '',
        )
        .replace('$FONT_TYPEKIT_URL', FONT_TYPEKIT_URL)
        .replace(
          '$FRAME_URL',
          [process.env.URL_RECOVERY_PHRASE_VIDEO]
            .map(u => {
              const url = new URL(u);
              return `${url.protocol}//${url.host}`;
            })
            .join(' '),
        )
        .replace(
          '$SWAP_PROVIDER_URLS',
          [process.env.STEELSWAP_API_BASE_URL].join(''),
        );

    if (process.env.EXTENSION_KEY) {
      manifest.key = manifest.key.replace(
        '$EXTENSION_KEY',
        process.env.EXTENSION_KEY,
      );
    } else {
      delete manifest.key;
    }
    return JSON.stringify(manifest);
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Ensures that the input value is an array.
 *
 * @param {string|string[]} value - A single string or an array of strings.
 * @returns {string[]} The value wrapped in an array if it was not already an array.
 */
const ensureIsArray = value => (Array.isArray(value) ? value : [value]);

/**
 * Creates a function that conditionally adds additional file paths
 * to an existing list based on a given condition.
 *
 * @param {string | string[]} entries - File paths to add if the condition is met.
 * @param {boolean | (() => boolean)} condition - A boolean or a function returning a boolean that determines if entries should be added.
 * @returns {(originalEntries: string | string[]) => string[]} A function that takes the original file paths and returns the updated list.
 */
const createWithConditionalEntries = (entries, condition) => originalEntries =>
  (typeof condition === 'function' ? condition() : condition)
    ? [...ensureIsArray(entries), ...ensureIsArray(originalEntries)]
    : originalEntries;

/**
 * Injects Sentry script before the entry file
 * if SENTRY_DSN is present in the environment variables
 */
const withMaybeSentry = createWithConditionalEntries(
  path.join(__dirname, '..', 'sentry.js'),
  process.env.SENTRY_DSN && process.env.SENTRY_DSN !== '',
);

const withMaybeDevelopmentEntries = createWithConditionalEntries(
  path.join(__dirname, '..', 'reactScan.js'),
  process.env.NODE_ENV === 'development',
);

module.exports = {
  transformManifest,
  withMaybeSentry,
  withMaybeDevelopmentEntries,
};
