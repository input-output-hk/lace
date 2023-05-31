const path = require('path');
const { NormalModuleReplacementPlugin, ProvidePlugin, IgnorePlugin, EnvironmentPlugin } = require('webpack');
const Dotenv = require('dotenv-webpack');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const { SubresourceIntegrityPlugin } = require('webpack-subresource-integrity');

const commitHash = Buffer.from(require('child_process').execSync('git rev-parse HEAD')).toString();
const app_version = require('./manifest.json').version;
require(`dotenv-defaults`).config({
  path: './.env',
  encoding: 'utf8',
  defaults: './.env.defaults'
});

module.exports = () => ({
  output: {
    path: path.join(__dirname, 'dist/js'),
    filename: '[name].js',
    // the following setting is required for SRI to work:
    crossOriginLoading: 'anonymous'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules\/(?!(@cardano-sdk)\/).*/,
        loader: 'swc-loader',
        options: {
          jsc: {
            parser: {
              syntax: 'typescript',
              tsx: true
            },
            target: 'es2019',
            loose: false
          }
        },
        resolve: {
          fullySpecified: false
        }
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.mjs'],
    fallback: {
      https: require.resolve('https-browserify'),
      http: require.resolve('stream-http'),
      'get-port-please': false,
      net: false,
      fs: false,
      os: false,
      path: false,
      events: require.resolve('events/'),
      buffer: require.resolve('buffer/'),
      stream: require.resolve('readable-stream'),
      crypto: require.resolve('crypto-browserify'),
      constants: require.resolve('constants-browserify'),
      zlib: require.resolve('browserify-zlib'),
      dns: false,
      tls: false,
      child_process: false
    },
    plugins: [new TsconfigPathsPlugin({ configFile: 'src/tsconfig.json' })]
  },
  plugins: [
    new IgnorePlugin({
      checkResource(resource) {
        return /.*\/wordlists\/(?!english).*\.json/.test(resource);
      }
    }),
    new IgnorePlugin({ resourceRegExp: /^\.\/wordlists\/(?!english)/, contextRegExp: /bip39\/src$/ }),
    new NormalModuleReplacementPlugin(/blake2b$/, 'blake2b-no-wasm'),
    new NormalModuleReplacementPlugin(/@emurgo\/cip14-js/, path.join(__dirname, './src/utils/cip14.js')),
    new NormalModuleReplacementPlugin(
      /@dcspark\/cardano-multiplatform-lib-nodejs/,
      '@dcspark/cardano-multiplatform-lib-browser'
    ),
    new NormalModuleReplacementPlugin(
      /@emurgo\/cardano-message-signing-nodejs/,
      '@emurgo/cardano-message-signing-browser'
    ),
    new ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser'
    }),
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        configFile: 'src/tsconfig.json'
      }
    }),
    new Dotenv({
      defaults: true,
      systemvars: true
    }),
    new EnvironmentPlugin({
      APP_VERSION: app_version,
      COMMIT_HASH: commitHash,
      'process.env': JSON.stringify(process.env)
    }),
    new SubresourceIntegrityPlugin()
  ]
});
