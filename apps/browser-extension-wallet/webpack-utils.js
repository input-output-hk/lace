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

    const cardanoServicesUrls = [
      process.env.CARDANO_SERVICES_URL_MAINNET,
      process.env.CARDANO_SERVICES_URL_PREPROD,
      process.env.CARDANO_SERVICES_URL_PREVIEW,
      process.env.CARDANO_SERVICES_URL_SANCHONET
    ].join(' ');

    const adaHandleUrls = [
      process.env.ADA_HANDLE_URL_MAINNET,
      process.env.ADA_HANDLE_URL_PREPROD,
      process.env.ADA_HANDLE_URL_PREVIEW,
      process.env.ADA_HANDLE_URL_SANCHONET
    ].join(' ');

    const connectSrcUrls = [
      cardanoServicesUrls,
      adaHandleUrls,
      process.env.COINGECKO_URL,
      process.env.MUESLISWAP_URL,
      process.env.LOCALHOST_CONNECT_SRC,
      process.env.LOOPBACK_IP_CONNECT_SRC,
      process.env.POSTHOG_URL,
      process.env.TYPEKIT_URL,
      'data:'
    ].join(' ');

    const extension_pages = `default-src 'self' ; frame-src ${process.env.TREZOR_URL_SRC} ${process.env.YOUTUBE_URL_SRC}; script-src 'self' 'wasm-unsafe-eval' ; font-src 'self' ${process.env.TYPEKIT_URL}; object-src 'self'; connect-src ${cardanoServicesUrls} ${adaHandleUrls} ${process.env.COINGECKO_URL} ${process.env.MUESLISWAP_URL} ${process.env.LOCALHOST_CONNECT_SRC} ${process.env.LOOPBACK_IP_CONNECT_SRC} ${process.env.POSTHOG_URL} ${process.env.TYPEKIT_URL} data:; style-src * 'unsafe-inline'; img-src * data:;`;

    manifest.content_security_policy = {
      extension_pages
    };

    if (process.env.BROWSER === 'firefox') {
      manifest.background = {
        scripts: ['./js/background.js']
      };
      if (process.env.WALLET_MANIFEST_FIREFOX_ID) {
        manifest.browser_specific_settings = {
          gecko: {
            id: process.env.WALLET_MANIFEST_FIREFOX_ID + '@lace.io',
            strict_min_version: '91.0'
          }
        };
      }
    } else if (process.env.BROWSER === 'chrome') {
      manifest.background = {
        service_worker: './js/background.js'
      };
      manifest.key = process.env.LACE_EXTENSION_KEY;
    }

    return JSON.stringify(manifest);
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = { transformManifest };
