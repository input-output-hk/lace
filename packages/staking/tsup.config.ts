/* eslint-disable new-cap */
import { ScssModulesPlugin } from 'esbuild-scss-modules-plugin';
import { defineConfig } from 'tsup';

const tsupConfig = defineConfig([
  {
    bundle: true,
    clean: true,
    dts: true,
    entry: ['./src/index.ts'],
    esbuildPlugins: [ScssModulesPlugin() as never],
    format: ['esm', 'cjs'],
    name: 'lace/staking',
    outDir: './dist',
    sourcemap: true,
  },
]);

export default tsupConfig;
