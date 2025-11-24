const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { NormalModuleReplacementPlugin } = require('webpack');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

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
    (config.resolve.plugins = config.resolve.plugins || []).push(
      new TsconfigPathsPlugin({ configFile: 'src/tsconfig.json' })
    );

    config.plugins.push(
      new NormalModuleReplacementPlugin(/@lace\/cardano/, require.resolve('./__mocks__/cardano.ts')),
      new NodePolyfillPlugin()
    );

    config.resolve.fallback.fs = false;

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
