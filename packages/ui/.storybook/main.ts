import { join, dirname } from 'node:path';

import type { StorybookConfig } from '@storybook/react-webpack5';
import { VanillaExtractPlugin } from '@vanilla-extract/webpack-plugin';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
const getAbsolutePath = (value: string): any =>
  dirname(require.resolve(join(value, 'package.json')));

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-essentials'),
    getAbsolutePath('@storybook/addon-interactions'),
    getAbsolutePath('storybook-addon-pseudo-states'),
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-webpack5'),
    options: {},
  },
  webpackFinal: config => {
    // @ts-expect-error VanillaExtractPlugin
    config.plugins = [new VanillaExtractPlugin(), ...(config.plugins || [])];

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

    const fileLoaderRule = config.module?.rules?.find(rule =>
      //@ts-expect-error storybook webpack config
      rule!.test?.test('.svg'),
    );
    //@ts-expect-error storybook webpack config
    fileLoaderRule.exclude = /\.svg$/;

    config.module?.rules?.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            icon: true,
            exportType: 'named',
          },
        },
      ],
    });

    config.resolve?.extensions?.push('.svg');

    return config;
  },
  docs: {
    autodocs: true,
  },
};

export default config;
