import { defineConfig } from 'tsup';

const tsupConfig = defineConfig([
  {
    bundle: true,
    clean: true,
    dts: true,
    entry: ['./src/index.ts'],
    format: ['esm', 'cjs'],
    name: 'lace/staking',
    outDir: './dist',
    sourcemap: true,
  },
]);

export default tsupConfig;
