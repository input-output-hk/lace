const { merge } = require('webpack-merge');

const createDevConfig = require('./webpack.common.dev');
const appConfig = require('./webpack.common.app');
require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: './.env.defaults'
});

module.exports = (env) => merge(createDevConfig({ devServerPort: 3001 })(env), appConfig());
