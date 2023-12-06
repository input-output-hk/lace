require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: './.env.defaults'
});

// ENV VARS overrides for tests
process.env.AVAILABLE_CHAINS = 'Preprod,Preview,Mainnet';
process.env.CARDANO_SERVICES_URL_MAINNET = 'https://mainnet-url.com';
process.env.CARDANO_SERVICES_URL_PREPROD = 'https://preprod-prod.com';
process.env.CARDANO_SERVICES_URL_PREVIEW = 'https://preview-prod.com';
process.env.CEXPLORER_URL_MAINNET = 'https://cexplorer.io';
process.env.CEXPLORER_URL_PREPROD = 'https://preprod.cexplorer.io';
process.env.CEXPLORER_URL_PREVIEW = 'https://preview.cexplorer.io';
process.env.CEXPLORER_URL_TESTNET = 'https://testnet.cexplorer.io';
process.env.POSTHOG_DEV_TOKEN_PREPROD = 'test-token';
process.env.PUBLIC_POSTHOG_HOST = 'https://eu.posthog.com';
