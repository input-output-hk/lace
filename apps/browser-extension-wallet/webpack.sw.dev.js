const { merge } = require('webpack-merge');

const createDevConfig = require('./webpack.common.dev');
const swConfig = require('./webpack.common.sw');
require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
});

module.exports = (env) => merge(createDevConfig({ devServerPort: 3000 })(env), swConfig());
