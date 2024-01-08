const { merge } = require('webpack-merge');

const prodConfig = require('./webpack.common.prod');
const swConfig = require('./webpack.common.sw');
require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
});

module.exports = () =>
  merge(
    prodConfig(),
    swConfig(),
    // Needed for the service worker to work with a production build
    { optimization: { moduleIds: 'named', mangleExports: false } }
  );
