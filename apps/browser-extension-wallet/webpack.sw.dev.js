const { merge } = require('webpack-merge');

const commonDevConfig = require('./webpack.common.dev');
const commonSwConfig = require('./webpack.common.sw');
require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
});

module.exports = (env) => merge(commonDevConfig({ devServerPort: 3000 })(env), commonSwConfig());
