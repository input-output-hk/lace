const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { NormalModuleReplacementPlugin, ProvidePlugin } = require('webpack');

module.exports = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    'storybook-addon-pseudo-states',
    {
      name: '@storybook/addon-styling',
      options: {
        sass: {
          // Require your Sass preprocessor here
          implementation: require('sass')
        }
      }
    }
  ],
  framework: '@storybook/react',
  webpackFinal: (config) => {
    const fileLoaderRule = config.module.rules.find((rule) => rule.test?.test('.svg'));
    fileLoaderRule.exclude = /\.svg$/;

    const jsRuleIndex = config.module.rules.findIndex((rule) => rule.test?.test('.js'));

    // Please refer to the apps/browser-extension-wallet/webpack.common.js
    config.module.rules[jsRuleIndex] = {
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
    };

    // Please refer to the apps/browser-extension-wallet/webpack.common.js
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve.fallback,
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
    };

    // Need to add similar plugins to apps/browser-extension-wallet webpack to avoid issues with stories not loading
    config.plugins = [
      ...config.plugins,
      new ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser'
      }),
      new NormalModuleReplacementPlugin(
        /@dcspark\/cardano-multiplatform-lib-nodejs/,
        '@dcspark/cardano-multiplatform-lib-browser'
      ),
      new NormalModuleReplacementPlugin(
        /@emurgo\/cardano-message-signing-nodejs/,
        '@emurgo/cardano-message-signing-browser'
      )
    ];

    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            exportType: 'named'
          }
        }
      ]
    });

    // Required to avoid issues with components that use SDK features that might touch signing lib, review removal once we no longer require these libs
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'javascript/auto',
      use: {
        loader: 'webassembly-loader-sw',
        options: {
          export: 'instance',
          importObjectProps:
            // eslint-disable-next-line max-len
            `'./cardano_multiplatform_lib_bg.js': __webpack_require__("../../node_modules/@dcspark/cardano-multiplatform-lib-browser/cardano_multiplatform_lib_bg.js"),
             './cardano_message_signing_bg.js': __webpack_require__("../../node_modules/@emurgo/cardano-message-signing-browser/cardano_message_signing_bg.js")`
        }
      }
    });

    config.experiments = {
      ...config.experiments,
      syncWebAssembly: true
    };

    config.resolve.extensions.push('.svg');

    return config;
  },
  core: {
    builder: 'webpack5',
    options: {
      lazyCompilation: true,
      fsCache: true,
      builder: {
        useSWC: true // This flag is automatically set by Storybook for all new Webpack5 projects (except Angular) in Storybook 7.6
      }
    }
  },
  features: {
    interactionsDebugger: true
  }
};
