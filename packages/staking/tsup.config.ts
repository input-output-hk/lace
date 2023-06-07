import { ScssModulesPlugin } from 'esbuild-scss-modules-plugin';
import { defineConfig } from 'tsup';
import { peerDependencies } from './package.json';

const tsupConfig = defineConfig([
  {
    bundle: true,
    clean: true,
    dts: true,
    entry: ['./src/index.ts'],
    // eslint-disable-next-line new-cap
    esbuildPlugins: [ScssModulesPlugin() as never],
    external: Object.keys(peerDependencies),
    format: ['esm', 'cjs'],
    name: 'lace/staking',
    outDir: './dist',
    sourcemap: true,
  },
]);

export default tsupConfig;
