const path = require('path');
const { merge } = require('webpack-merge');
const commonConfig = require('./webpack.common');

require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
});

module.exports = () =>
  merge(commonConfig(), {
    entry: {
      content: path.join(__dirname, 'src/lib/scripts/background/content.ts'),
      inject: path.join(__dirname, 'src/lib/scripts/background/inject.ts')
    },
    output: {
      path: path.join(__dirname, 'dist/app'),
      filename: '[name].js',
      // the following setting is required for SRI to work:
      crossOriginLoading: 'anonymous'
    },
    experiments: {
      syncWebAssembly: true
    }
  });
