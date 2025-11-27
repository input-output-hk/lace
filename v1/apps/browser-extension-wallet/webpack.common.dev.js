const path = require('path');
const { merge } = require('webpack-merge');
const { transformManifest } = require('./webpack-utils');
const Dotenv = require('dotenv-webpack');
require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
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
          new Dotenv({
            path: '.env',
            safe: false,
            silent: false,
            defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? '.env.developerpreview' : true,
            systemvars: true,
            allowEmptyValues: true
          })
        ],
        watchOptions: {
          aggregateTimeout: 3000,
          followSymlinks: true
        }
      },
      serverConfig(env.RUN_DEV_SERVER, devServerPort)
    );
