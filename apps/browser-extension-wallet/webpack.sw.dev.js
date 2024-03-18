const { merge } = require('webpack-merge');

const createDevConfig = require('./webpack.shared.dev');
const swConfig = require('./webpack.sw.common');
require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
});

module.exports = (env) => merge(createDevConfig({ devServerPort: 3000 })(env), swConfig());
