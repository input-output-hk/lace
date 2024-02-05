const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

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

    config.resolve.extensions.push('.svg');

    return config;
  },
  core: {
    builder: 'webpack5',
    options: {
      lazyCompilation: true,
      fsCache: true
    }
  },
  features: {
    interactionsDebugger: true
  }
};
