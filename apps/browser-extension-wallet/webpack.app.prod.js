const { merge } = require('webpack-merge');

const prodConfig = require('./webpack.common.prod');
const appConfig = require('./webpack.common.app');

require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
});

module.exports = () => merge(prodConfig(), appConfig());
