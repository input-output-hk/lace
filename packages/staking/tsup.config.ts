import svgrJsx from '@svgr/plugin-jsx';
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin';
import svgr from 'esbuild-plugin-svgr';
import { ScssModulesPlugin } from 'esbuild-scss-modules-plugin';
import { defineConfig } from 'tsup';
import { peerDependencies } from './package.json';

const tsupConfig = defineConfig([
  {
    bundle: true,
    clean: true,
    dts: {
      resolve: true,
    },
    entry: ['./src/index.ts'],
    esbuildPlugins: [
      // eslint-disable-next-line new-cap
      ScssModulesPlugin() as never,
      vanillaExtractPlugin({ esbuildOptions: { loader: { '.css': 'empty' } } }),
      svgr({ icon: true, plugins: [svgrJsx] }),
    ],
    external: Object.keys(peerDependencies),
    format: ['esm', 'cjs'],
    loader: {
      '.png': 'dataurl',
    },
    name: 'lace/staking',
    outDir: './dist',
    sourcemap: true,
  },
]);

export default tsupConfig;
