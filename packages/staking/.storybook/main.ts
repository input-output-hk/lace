import type { StorybookConfig } from '@storybook/react-vite';

import { dirname, join } from 'path';
import { mergeConfig, UserConfig } from 'vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import svgrPlugin from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

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
    getAbsolutePath('storybook-addon-pseudo-states'),
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  async viteFinal(baseConfig) {
    const userConfig: UserConfig = {
      plugins: [
        nodePolyfills(),
        svgrPlugin({
          include: '**/*.svg',
          svgrOptions: { icon: true, exportType: 'default' },
        }),
        vanillaExtractPlugin({
          esbuildOptions: { loader: { '.css': 'empty' } },
        }),
        tsconfigPaths(),
      ],
    };

    return mergeConfig(baseConfig, userConfig);
  },
};

export default config;
