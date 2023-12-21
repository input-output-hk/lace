const { VanillaExtractPlugin } = require('@vanilla-extract/webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const path = require('path');

module.exports = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    'storybook-addon-pseudo-states',
  ],
  framework: '@storybook/react',
  webpackFinal: (config) => {
    config.plugins = [
      ...config.plugins,
      new VanillaExtractPlugin(),
      new MiniCssExtractPlugin(),
      // TODO make it work. Then we can bring back aliases if needed `../../../outside-handles-provider` -> `features/outside-handles-provider`
      // new TsconfigPathsPlugin({ baseUrl: path.resolve(__dirname, '../src') }),
    ];

    // HMR doesn't work with vanilla-extract
    // https://github.com/vanilla-extract-css/vanilla-extract/issues/905#issuecomment-1307664487
    if (process.env.NODE_ENV === 'development') {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'async',
          minSize: 20_000,
          minRemainingSize: 0,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          enforceSizeThreshold: 50_000,
          cacheGroups: {
            defaultVendors: {
              test: `[\\/]node_modules[\\/](?!.*vanilla-extract)`,
              priority: -10,
              reuseExistingChunk: true,
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // remove any existing css loaders - staking storybook components use only vanilla-extract
    config.module.rules = config.module.rules.filter((rule) => !rule.test?.test('test.css'));
    // UI Toolkit vanilla-extract
    // due to the nature of vanillaExtractPlugin() used in the rollup build in the @lace/ui
    // we need to target pre-built files e.g. component.vanilla-13hs15.css instead of component.vanilla.css
    config.module.rules.push({
      test: /\.vanilla-.*.css$/i,
      include: path.resolve(__dirname, '../../ui'),
      use: [
        MiniCssExtractPlugin.loader,
        {
          loader: require.resolve('css-loader'),
          options: { url: false },
        },
      ],
    });
    // Staking vanilla-extract
    config.module.rules.push({
      test: /\.vanilla.css$/i,
      exclude: /node_modules/,
      use: [
        MiniCssExtractPlugin.loader,
        {
          loader: require.resolve('css-loader'),
          options: { url: false },
        },
      ],
    });

    const fileLoaderRule = config.module.rules.find((rule) => rule.test?.test('.svg'));
    fileLoaderRule.exclude = /\.svg$/;

    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            icon: true,
            exportType: 'default',
          },
        },
      ],
    });

    config.resolve.extensions.push('.svg');

    return config;
  },
  core: {
    builder: 'webpack5',
    options: {
      lazyCompilation: true,
      fsCache: true,
    },
  },
  features: {
    interactionsDebugger: true,
  },
};
