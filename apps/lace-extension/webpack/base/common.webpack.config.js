const path = require('node:path');

const Dotenv = require('dotenv-webpack');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const NormalModuleReplacementPlugin =
  require('webpack').NormalModuleReplacementPlugin;
const { ProvidePlugin } = require('webpack');

const outputDirectory = path.join(__dirname, '..', '..', 'dist');

const mode = process.env.NODE_ENV;

/**
 * Creates a base Webpack configuration object.
 *
 * @param {Object} options - Configuration options.
 * @param {'none' | 'development' | 'production'} [options.mode = 'production'] - The mode for Webpack
 * @returns {Object} The base Webpack configuration object.
 */
const baseConfig = {
  mode,
  resolve: {
    fallback: {
      'get-port-please': false,
      net: false,
      fs: false,
      os: false,
      path: false,
      dns: false,
      tls: false,
      child_process: false,
      perf_hooks: false,
      crypto: false,
    },
    extensions: ['.ts', '.js', '.tsx'],
    alias: {
      'react-native': 'react-native-web',
      'react-native-svg': 'react-native-svg-web',
      'react-native-linear-gradient': 'react-native-web-linear-gradient',
      // @trezor/connect-webextension runs in MV3 service workers and extension
      // pages: it talks to Trezor Suite Web via `externally_connectable` and
      // no longer requires a DOM-hosted iframe. Aliasing lets us use the
      // DOM-free variant everywhere — including the SW — without forking
      // @cardano-sdk/hardware-trezor which hard-codes @trezor/connect-web.
      '@trezor/connect-web$': '@trezor/connect-webextension',
    },
    // posthog-node v5+ uses Node.js-only modules (fs, readline) in its "node" export condition.
    // Prefer "edge" condition which is browser-compatible.
    conditionNames: ['edge', 'browser', 'import', 'require', 'default'],
  },
  experiments: {
    asyncWebAssembly: true,
  },
  module: {
    rules: [
      {
        resolve: { fullySpecified: false },
        test: /node_modules\/@cardano-sdk\/.+$/,
      },
      {
        exclude: /node_modules\/(?!(@lib)|(@module)\/).*/,
        resolve: { fullySpecified: false },
        test: /\.(js|tsx?)$/,
        use: [
          {
            loader: 'swc-loader',
          },
        ],
      },
      {
        resolve: { fullySpecified: false },
        test: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
        exclude: /\.module\.css$/,
      },
      {
        exclude: /node_modules/,
        test: /\.scss$/,
        use: [
          // Creates style nodes from JS strings
          'style-loader',
          {
            // Translates CSS into CommonJS
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName:
                  mode === 'development' ? '[name]__[local]' : '[hash:base64]',
              },
            },
          },
          {
            // Compiles Sass to CSS
            loader: 'sass-loader',
          },
        ],
      },
      {
        test: /\.(eot|otf|ttf|woff|woff2|gif|png|webm)$/,
        loader: 'file-loader',
      },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              icon: true,
            },
          },
        ],
      },
    ],
  },
  output: {
    filename: '[name].js',
    path: path.join(outputDirectory, 'js'),
  },
  plugins: [
    new NodePolyfillPlugin(),
    new ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
    new Dotenv({
      allowEmptyValues: false,
      defaults: path.join(__dirname, '..', '.env.defaults'),
      path: path.join(__dirname, '..', '.env'),
      safe: path.join(__dirname, '..', '.env.example'),
      silent: false,
      systemvars: true,
    }),
    new NormalModuleReplacementPlugin(/node:/, resource => {
      resource.request = resource.request.replace(/^node:/, '');
    }),
    new NormalModuleReplacementPlugin(
      /node_modules\/react-native-reanimated/,
      require.resolve('../empty.js'),
    ),
    new NormalModuleReplacementPlugin(
      /node_modules\/react-native-gesture-handler/,
      require.resolve('../empty.js'),
    ),
    new NormalModuleReplacementPlugin(
      /node_modules\/@gorhom\/bottom-sheet/,
      require.resolve('../empty.js'),
    ),
    new NormalModuleReplacementPlugin(
      /node_modules\/react-navigation/,
      require.resolve('../empty.js'),
    ),
    new NormalModuleReplacementPlugin(
      /node_modules\/expo-blur/,
      require.resolve('../empty.js'),
    ),
    new NormalModuleReplacementPlugin(
      /node_modules\/expo-camera/,
      require.resolve('../empty.js'),
    ),
    new NormalModuleReplacementPlugin(
      /node_modules\/expo-clipboard/,
      require.resolve('../empty.js'),
    ),
    new NormalModuleReplacementPlugin(
      /node_modules\/expo-linear-gradient/,
      require.resolve('../empty.js'),
    ),
    new NormalModuleReplacementPlugin(
      /node_modules\/expo-image/,
      require.resolve('../empty.js'),
    ),
    new NormalModuleReplacementPlugin(
      /node_modules\/expo-asset/,
      require.resolve('../expo-asset-mock.js'),
    ),
    new NormalModuleReplacementPlugin(
      /node_modules\/expo-modules-core/,
      require.resolve('../empty.js'),
    ),
    new NormalModuleReplacementPlugin(
      /node_modules\/expo-haptics/,
      require.resolve('../empty.js'),
    ),
    new NormalModuleReplacementPlugin(
      /node_modules\/react-native-safe-area-context/,
      require.resolve('../empty.js'),
    ),
    new NormalModuleReplacementPlugin(/node-fetch/, resource => {
      resource.request = path.join(__dirname, '../fetch.js');
    }),
    new NormalModuleReplacementPlugin(
      /@emurgo\/cardano-message-signing-nodejs/,
      '@emurgo/cardano-message-signing-browser',
    ),
    new NormalModuleReplacementPlugin(/feature-flags$/, resource => {
      const fs = require('fs');
      const path = require('path');

      const overridePath = path.resolve(
        __dirname,
        '..',
        '..',
        'src',
        'feature-flags.override.ts',
      );

      if (fs.existsSync(overridePath)) {
        // Use override file if it exists
        resource.request = overridePath;
      }
    }),
  ],
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[/\\]node_modules[/\\]/,
          priority: -10,
          reuseExistingChunk: true,
        },
        lace: {
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
  },
};

module.exports = { baseConfig, outputDirectory };
