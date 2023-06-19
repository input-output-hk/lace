import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin';
import { ScssModulesPlugin } from 'esbuild-scss-modules-plugin';
import { defineConfig } from 'tsup';
import { peerDependencies } from './package.json';

const tsupConfig = defineConfig([
  {
    bundle: true,
    clean: true,
    dts: true,
    entry: ['./src/index.ts'],
    esbuildPlugins: [
      // eslint-disable-next-line new-cap
      ScssModulesPlugin() as never,
      vanillaExtractPlugin({ esbuildOptions: { loader: { '.css': 'empty' } } }),
    ],
    external: Object.keys(peerDependencies),
    format: ['esm', 'cjs'],
    name: 'lace/staking',
    outDir: './dist',
    sourcemap: true,
  },
]);

export default tsupConfig;
