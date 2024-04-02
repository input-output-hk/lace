const { merge } = require('webpack-merge');

const createDevConfig = require('./webpack.common.dev');
const appConfig = require('./webpack.common.app');
require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
});

console.log('WEBPACK Build App Dev');
console.log('CARDANO SERVICES URL MAINNET: ', process.env.CARDANO_SERVICES_URL_MAINNET);
console.log('CARDANO SERVICES URL PREPROD: ', process.env.CARDANO_SERVICES_URL_PREPROD);
console.log('CARDANO SERVICES URL PREVIEW: ', process.env.CARDANO_SERVICES_URL_PREVIEW);
console.log('CARDANO SERVICES URL SANCHONET: ', process.env.CARDANO_SERVICES_URL_SANCHONET);

module.exports = (env) => merge(createDevConfig({ devServerPort: 3001 })(env), appConfig());
