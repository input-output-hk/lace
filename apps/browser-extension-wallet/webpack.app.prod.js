const { merge } = require('webpack-merge');

const prodConfig = require('./webpack.shared.prod');
const appConfig = require('./webpack.app.common');
require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
});

module.exports = () => merge(prodConfig(), appConfig());
