import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
import typescript from '@rollup/plugin-typescript';
import svgr from '@svgr/rollup';
import { vanillaExtractPlugin } from '@vanilla-extract/rollup-plugin';
import copy from 'rollup-plugin-copy';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

import packageJson from './package.json';

export default () => ({
  input: 'src/index.ts',
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      composite: false,
      exclude: ['**/*.stories.tsx'],
    }),
    peerDepsExternal(),
    commonjs(),
    image(),
    svgr({ icon: true }),
    vanillaExtractPlugin(),
    copy({
      targets: [{ src: 'src/assets/icons/*', dest: 'dist/assets/icons' }],
    }),
  ],
  output: [
    {
      file: packageJson.main,
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: packageJson.module,
      format: 'esm',
      sourcemap: true,
    },
  ],
  external: [/node_modules/],
});
