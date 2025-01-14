const constructSentryConnectSrc = (dsn) => {
  if (/https:\/\/[^@]+@([^/]+).*/.test(dsn)) return dsn.replace(/https:\/\/[^@]+@([^/]+).*/, 'https://$1');
  return '';
};

const transformManifest = (content, mode) => {
  require('dotenv-defaults').config({
    path: './.env',
    encoding: 'utf8',
    defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
  });
  try {
    const manifest = JSON.parse(content.toString());
    manifest.name = manifest.name.replace('$WALLET_MANIFEST_NAME', process.env.WALLET_MANIFEST_NAME);
    if (process.env.BUILD_DEV_PREVIEW === 'true') {
      const date = new Date();
      manifest.version = `${manifest.version}.${date.getMonth()}${date.getDate()}`;
    }
    manifest.content_security_policy.extension_pages = manifest.content_security_policy.extension_pages
      .replace(
        '$CARDANO_WS_SERVER_URLS',
        `${process.env.CARDANO_WS_SERVER_URL_MAINNET} ${process.env.CARDANO_WS_SERVER_URL_PREPROD} ${process.env.CARDANO_WS_SERVER_URL_PREVIEW} ${process.env.CARDANO_WS_SERVER_URL_SANCHONET}`
      )
      .replace(
        '$CARDANO_SERVICES_URLS',
        `${process.env.CARDANO_SERVICES_URL_MAINNET} ${process.env.CARDANO_SERVICES_URL_PREPROD} ${process.env.CARDANO_SERVICES_URL_PREVIEW} ${process.env.CARDANO_SERVICES_URL_SANCHONET}`
      )
      .replace(
        '$BLOCKFROST_URLS',
        `${process.env.BLOCKFROST_URL_MAINNET} ${process.env.BLOCKFROST_URL_PREPROD} ${process.env.BLOCKFROST_URL_PREVIEW} ${process.env.BLOCKFROST_URL_SANCHONET}`
      )
      .replace('$LOCALHOST_DEFAULT_SRC', mode === 'development' ? 'http://localhost:3000' : '')
      .replace('$LOCALHOST_SCRIPT_SRC', mode === 'development' ? 'http://localhost:3000' : '')
      .replace(
        '$LOCALHOST_CONNECT_SRC',
        mode === 'development'
          ? 'http://localhost:* http://127.0.0.1:* ws://localhost:3000 ws://0.0.0.0:3000/ws wss://localhost:3000  ws://localhost:3001 ws://0.0.0.0:3001/ws wss://localhost:3001'
          : 'http://localhost:* http://127.0.0.1:*'
      )
      .replace('$POSTHOG_HOST', process.env.POSTHOG_HOST)
      .replace('$SENTRY_URL', constructSentryConnectSrc(process.env.SENTRY_DSN))
      .replace('$DAPP_RADAR_APPI_URL', process.env.DAPP_RADAR_API_URL);

    if (process.env.LACE_EXTENSION_KEY) {
      manifest.key = manifest.key.replace('$LACE_EXTENSION_KEY', process.env.LACE_EXTENSION_KEY);
    } else {
      delete manifest.key;
    }
    return JSON.stringify(manifest);
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = { transformManifest };
