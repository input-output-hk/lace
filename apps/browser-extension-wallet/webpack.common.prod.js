const CopyPlugin = require('copy-webpack-plugin');
const { transformManifest } = require('./webpack-utils');
const Dotenv = require('dotenv-webpack');

require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
});

module.exports = () => ({
  mode: 'production',
  devtool: false,
  performance: {
    // images/videos might be larger
    maxAssetSize: 30_000_000,
    // Mozilla doesn't allow assets larger than 4M
    maxEntrypointSize: 4_000_000,
    hints: 'error'
  },
  plugins: [
    new Dotenv({
      path: '.env',
      safe: false,
      silent: false,
      defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? '.env.developerpreview' : true,
      systemvars: true,
      allowEmptyValues: true
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'manifest.json',
          to: '../manifest.json',
          transform: (content) => transformManifest(content, 'production')
        }
      ]
    })
  ]
});
