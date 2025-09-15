const { merge } = require('webpack-merge');

const commonDevConfig = require('./webpack.common.dev');
const commonCsConfig = require('./webpack.common.cs');
require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
});

module.exports = (env) => merge(commonDevConfig({ devServerPort: 3001 })(env), commonCsConfig());
