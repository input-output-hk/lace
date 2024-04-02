const { merge } = require('webpack-merge');

const prodConfig = require('./webpack.common.prod');
const appConfig = require('./webpack.common.app');
require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults',
  override: true
});

console.log('WEBPACK Build App Prod');
console.log('CARDANO SERVICES URL MAINNET: ', process.env.CARDANO_SERVICES_URL_MAINNET);
console.log('CARDANO SERVICES URL PREPROD: ', process.env.CARDANO_SERVICES_URL_PREPROD);
console.log('CARDANO SERVICES URL PREVIEW: ', process.env.CARDANO_SERVICES_URL_PREVIEW);
console.log('CARDANO SERVICES URL SANCHONET: ', process.env.CARDANO_SERVICES_URL_SANCHONET);

module.exports = () => merge(prodConfig(), appConfig());
