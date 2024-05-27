const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackHarddiskPlugin = require('html-webpack-harddisk-plugin');
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
      popup: path.join(__dirname, 'src/index-popup.tsx'),
      options: path.join(__dirname, 'src/index-options.tsx'),
      dappConnector: path.join(__dirname, 'src/index-dapp-connector.tsx'),
      ['trezor-content-script']: path.join(__dirname, 'src/lib/scripts/trezor/trezor-content-script.ts'),
      ['trezor-usb-permissions']: path.join(__dirname, 'src/lib/scripts/trezor/trezor-usb-permissions.ts')
    },
    experiments: {
      syncWebAssembly: true,
      topLevelAwait: true
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
                modules: true
              }
            }
          ],
          include: /\.module\.css$/
        },
        {
          // Review: why are there 2 loaders with exactly the same 'test' for css?
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
          exclude: /\.module\.css$/
        },
        {
          exclude: /node_modules/,
          test: /\.scss$/,
          use: [
            'style-loader', // Creates style nodes from JS strings
            'css-loader', // Translates CSS into CommonJS
            'sass-loader' // Compiles Sass to CSS
          ]
        },
        {
          test: /^[.]*(?!.*\.component\.svg$).*\.svg*$/,
          use: 'file-loader'
        },
        {
          test: /component\.svg(\?v=\d+\.\d+\.\d+)?$/,
          use: [
            {
              loader: '@svgr/webpack',
              options: {
                icon: true
              }
            }
          ]
        },
        {
          test: /\.(eot|otf|ttf|woff|woff2|gif|png|webm)$/,
          loader: 'file-loader'
        },
        {
          test: /\.txt$/i,
          loader: 'raw-loader'
        }
      ]
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'src/assets/branding/*.png', to: '../[name][ext]' },
          { from: 'src/assets/html/trezor-usb-permissions.html', to: '../[name][ext]' }
        ]
      }),
      new HtmlWebpackPlugin({
        filename: '../popup.html',
        template: 'src/assets/html/popup.html',
        chunks: ['popup'],
        alwaysWriteToDisk: true
      }),
      new HtmlWebpackPlugin({
        filename: '../app.html',
        template: 'src/assets/html/app.html',
        chunks: ['options'],
        alwaysWriteToDisk: true
      }),
      new HtmlWebpackPlugin({
        filename: '../dappConnector.html',
        template: 'src/assets/html/popup.html',
        chunks: ['dappConnector'],
        alwaysWriteToDisk: true
      }),
      new HtmlWebpackHarddiskPlugin()
    ]
  });
