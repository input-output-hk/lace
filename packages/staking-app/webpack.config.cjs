const path = require('path');
const { NormalModuleReplacementPlugin, ProvidePlugin, IgnorePlugin, EnvironmentPlugin, experiments } = require('webpack');

module.exports = {
  mode: 'development',
  entry: './src/main.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    library: 'staking', // Name of the global variable for the UMD build
    libraryTarget: 'umd', // Universal Module Definition for compatibility
    globalObject: 'this', // Fix for environments where `window` is undefined
  },
  devtool: 'eval-source-map',
  externals: {
    react: 'react', // Avoid bundling React
    'react-dom': 'react-dom', // Avoid bundling ReactDOM
  },
  experiments: {
    asyncWebAssembly: true,
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
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
        exclude: /\.module\.css$/
      },
      {
        exclude: /node_modules/,
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader'
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
        test: /packages\/.+\/dist\/.+\.js$/,
        enforce: 'pre',
        use: ['source-map-loader']
      },
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
      },
      {
        test: /\.wasm$/,
        type: 'javascript/auto',
        use: {
          loader: 'webassembly-loader-sw',
          options: {
            export: 'instance',
            importObjectProps: `'./cardano_message_signing_bg.js': __webpack_require__("../../node_modules/@emurgo/cardano-message-signing-browser/cardano_message_signing_bg.js")`
          }
        }
      }
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    fullySpecified: false,
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
      process: false,
      child_process: false
    },
  },
  plugins: [
    new NormalModuleReplacementPlugin(/blake2b$/, 'blake2b-no-wasm'),
    new NormalModuleReplacementPlugin(/@emurgo\/cip14-js/, path.join(__dirname, './src/utils/cip14.js')),
    new NormalModuleReplacementPlugin(
      /@emurgo\/cardano-message-signing-nodejs/,
      '@emurgo/cardano-message-signing-browser'
    ),
    new ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser'
    }),
  ]
};
