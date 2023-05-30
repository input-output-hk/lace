require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: './.env.defaults'
});

const transformManifest = (content, mode) => {
  const manifest = JSON.parse(content.toString());
  manifest.content_security_policy.extension_pages = manifest.content_security_policy.extension_pages
    .replace(
      '$CARDANO_SERVICES_URLS',
      `${process.env.CARDANO_SERVICES_URL_MAINNET} ${process.env.CARDANO_SERVICES_URL_PREPROD} ${process.env.CARDANO_SERVICES_URL_PREVIEW}`
    )
    .replace('$LOCALHOST_DEFAULT_SRC', mode === 'development' ? 'http://localhost:3000' : '')
    .replace('$LOCALHOST_SCRIPT_SRC', mode === 'development' ? 'http://localhost:3000' : '')
    .replace(
      '$LOCALHOST_CONNECT_SRC',
      mode === 'development'
        ? 'http://localhost:3000 http://localhost:3001 http://localhost:8080 ws://localhost:3000 ws://0.0.0.0:3000/ws wss://localhost:3000  ws://localhost:3001 ws://0.0.0.0:3001/ws wss://localhost:3001'
        : ''
    );

  if (process.env.LACE_EXTENSION_KEY) {
    manifest.key = manifest.key.replace('$LACE_EXTENSION_KEY', process.env.LACE_EXTENSION_KEY);
  } else {
    delete manifest.key;
  }

  return JSON.stringify(manifest);
};

module.exports = { transformManifest };
