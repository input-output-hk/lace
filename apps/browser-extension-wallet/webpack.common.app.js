const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { merge } = require('webpack-merge');
const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');
const commonConfig = require('./webpack.common');

require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
});

const hasSentryReleaseConfig =
  !!process.env.SENTRY_AUTH_TOKEN && !!process.env.SENTRY_ORG && !!process.env.SENTRY_PROJECT;

const getVersion = () => {
  const version = require('./manifest.json').version;
  const commitHash = require('child_process').execSync('git rev-parse --short HEAD').toString().trim();
  return `${version}-${commitHash}`;
};

const withMaybeSentry = (p) => ('SENTRY_DSN' in process.env ? [path.join(__dirname, 'sentry.js'), p] : p);

module.exports = () =>
  merge(commonConfig(), {
    entry: {
      popup: withMaybeSentry(path.join(__dirname, 'src/index-popup.tsx')),
      options: withMaybeSentry(path.join(__dirname, 'src/index-options.tsx')),
      dappConnector: withMaybeSentry(path.join(__dirname, 'src/index-dapp-connector.tsx')),
      ['trezor-content-script']: path.join(__dirname, 'src/lib/scripts/trezor/trezor-content-script.ts'),
      ['trezor-usb-permissions']: withMaybeSentry(
        path.join(__dirname, 'src/lib/scripts/trezor/trezor-usb-permissions.ts')
      )
    },
    experiments: {
      syncWebAssembly: true
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
          test: /\.(eot|otf|ttf|woff|woff2|gif|png|webm|mp4)$/,
          loader: 'file-loader'
        },
        {
          test: /\.txt$/i,
          loader: 'raw-loader'
        }
      ]
    },
    plugins: [
      ...(hasSentryReleaseConfig
        ? [
            sentryWebpackPlugin({
              authToken: process.env.SENTRY_AUTH_TOKEN,
              org: process.env.SENTRY_ORG,
              project: process.env.SENTRY_PROJECT,
              sourcemaps: {
                filesToDeleteAfterUpload: ['**/*.js.map'],
                assets: ['**/*.js.map']
              },
              release: {
                name: getVersion()
              },
              telemetry: false,
              url: 'https://sentry.io/'
            })
          ]
        : []),
      new CopyPlugin({
        patterns: [
          { from: 'src/assets/branding/*.png', to: '../[name][ext]' },
          { from: 'src/assets/html/trezor-usb-permissions.html', to: '../[name][ext]' },
          { from: path.resolve(__dirname, '../../packages/nami/dist/assets/video/*.mp4'), to: '../[name][ext]' },
          { from: path.resolve(__dirname, 'src/assets/html/*.html'), to: '../[name][ext]' },
          { from: path.resolve(__dirname, 'src/assets/html/*.js'), to: '../js/[name][ext]' },
          { from: path.resolve(__dirname, 'src/assets/html/*.css'), to: '../[name][ext]' },
          {
            from: path.resolve(__dirname, '../../packages/common/src/ui/assets/icons/loader.png'),
            to: '../[name][ext]'
          }
        ]
      })
    ]
  });
