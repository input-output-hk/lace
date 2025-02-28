import svgrJsx from '@svgr/plugin-jsx';
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin';
import svgr from 'esbuild-plugin-svgr';
import { ScssModulesPlugin } from 'esbuild-scss-modules-plugin';
import { defineConfig } from 'tsup';

const tsupConfig = defineConfig([
  {
    bundle: true,
    clean: true,
    dts: {
      resolve: true,
    },
    entry: ['./src/index.ts'],
    esbuildPlugins: [
      vanillaExtractPlugin({ esbuildOptions: { loader: { '.css': 'empty' } }, identifiers: 'short' }),
      // eslint-disable-next-line new-cap
      ScssModulesPlugin() as never,
      svgr({ icon: true, plugins: [svgrJsx] }),
    ],
    format: ['cjs'],
    loader: {
      '.png': 'dataurl',
    },
    name: 'lace/staking',
    outDir: './dist',
    sourcemap: true,
  },
]);

export default tsupConfig;
