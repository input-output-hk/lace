import type { StorybookConfig } from '@storybook/react-vite';

import { dirname, join } from 'path';
import { mergeConfig, UserConfig } from 'vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import svgrPlugin from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';
import turbosnap from 'vite-plugin-turbosnap';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
// TODO to be removed when @lace/icons properly supports ESM
import commonjs from 'vite-plugin-commonjs';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, 'package.json')));
}

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-essentials'),
    getAbsolutePath('@storybook/addon-interactions'),
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  core: {
    builder: '@storybook/builder-vite',
  },
  async viteFinal(baseConfig) {
    const userConfig: UserConfig = {
      plugins: [
        commonjs(),
        nodePolyfills(),
        svgrPlugin({
          include: '**/*.svg',
          svgrOptions: { icon: true, exportType: 'default' },
        }),
        vanillaExtractPlugin({
          esbuildOptions: { loader: { '.css': 'empty' } },
        }),
        tsconfigPaths(),
        turbosnap({
          rootDir: baseConfig.root ?? process.cwd(),
        }),
      ],
      resolve: {
        alias: [
          {
            find: '@lace/cardano',
            replacement: require.resolve('./__mocks__/cardano.tsx'),
          },
        ],
      },
    };

    return mergeConfig(baseConfig, userConfig);
  },
};

export default config;
