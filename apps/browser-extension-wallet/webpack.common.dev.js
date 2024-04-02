const path = require('path');
const { merge } = require('webpack-merge');
const CopyPlugin = require('copy-webpack-plugin');
const { transformManifest } = require('./webpack-utils');
const Dotenv = require('dotenv-webpack');

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
            path: './.env',
            safe: false,
            silent: false,
            defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? '.env.devpreview' : true,
            systemvars: true,
            allowEmptyValues: true,
            override: true
          }),
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
