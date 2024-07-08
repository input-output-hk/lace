import type { StorybookConfig } from '@storybook/react-webpack5';
const { NormalModuleReplacementPlugin, ProvidePlugin } = require('webpack');

import { join, dirname } from 'path';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, 'package.json')));
}
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    getAbsolutePath('@storybook/addon-webpack5-compiler-swc'),
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-essentials'),
    getAbsolutePath('@chromatic-com/storybook'),
  ],
  staticDirs: ['../public'],
  framework: {
    name: getAbsolutePath('@storybook/react-webpack5'),
    options: {},
  },
  webpackFinal: config => {
    if (config.resolve?.alias) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@emotion/core': '@emotion/react',
        'emotion-theming': '@emotion/react',
      };
    }

    if (config.plugins) {
      config.plugins.push(
        new ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        }),
      );

      config.plugins.push(
        new NormalModuleReplacementPlugin(
          /api\/extension\/wallet$/,
          join(__dirname, '../src/api/extension/wallet.mock.ts'),
        ),
        new NormalModuleReplacementPlugin(
          /api\/util$/,
          join(__dirname, '../src/api/util.mock.ts'),
        ),
        new NormalModuleReplacementPlugin(
          /api\/extension$/,
          join(__dirname, '../src/api/extension/api.mock.ts'),
        ),
        new NormalModuleReplacementPlugin(
          /store$/,
          join(__dirname, '../src/ui/store.mock.ts'),
        ),
        new NormalModuleReplacementPlugin(
          /^react-router-dom$/,
          join(__dirname, './mocks/react-router-dom.mock.tsx'),
        ),
        new NormalModuleReplacementPlugin(
          /loader$/,
          join(__dirname, '../src/api/loader.mock.ts'),
        ),
        new NormalModuleReplacementPlugin(
          /signTxUtil$/,
          join(__dirname, '../src/ui/app/pages/dapp-connector/signTxUtil.mock.ts'),
        ),
      );
    }

    return config;
  },
};
export default config;
