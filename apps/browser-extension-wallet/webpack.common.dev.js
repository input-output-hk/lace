const path = require('path');
const { merge } = require('webpack-merge');
const CopyPlugin = require('copy-webpack-plugin');
const { transformManifest } = require('./webpack-utils');
require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: './.env.defaults'
});

const serverConfig = (RUN_DEV_SERVER, port) =>
  RUN_DEV_SERVER
    ? {
        devServer: {
          port,
          static: {
            directory: path.resolve(__dirname, 'src')
          },
          devMiddleware: {
            writeToDisk: true
          },
          allowedHosts: 'all',
          historyApiFallback: true,
          hot: false,
          liveReload: false,
          client: {
            overlay: {
              errors: true,
              warnings: false
            }
          }
        }
      }
    : {};

module.exports =
  ({ devServerPort }) =>
  (env) =>
    merge(
      // common dev
      {
        mode: 'development',
        devtool: 'inline-source-map',
        cache: { type: 'filesystem' },
        plugins: [
          new CopyPlugin({
            patterns: [
              {
                from: 'manifest.json',
                to: '../manifest.json',
                transform: (content) => transformManifest(content, 'development')
              }
            ]
          })
        ],
        watchOptions: {
          aggregateTimeout: 3000,
          followSymlinks: true
        }
      },
      serverConfig(env.RUN_DEV_SERVER, devServerPort)
    );
