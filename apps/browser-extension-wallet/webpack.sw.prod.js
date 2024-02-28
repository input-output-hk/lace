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
    // TODO: after removing imports from dist/cjs, service worker no longer loads when built in production mode.
    // It is likely that some optimization is triggering it, such as tree shaking.
    { mode: 'development', optimization: { moduleIds: 'named', mangleExports: false } }
  );
