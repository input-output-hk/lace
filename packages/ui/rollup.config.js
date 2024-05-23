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
      exclude: ['node_modules', '**/*.stories.tsx'],
    }),
    vanillaExtractPlugin({ identifiers: 'short' }),
    peerDepsExternal(),
    commonjs(),
    image(),
    svgr({ icon: true }),
    copy({
      copyOnce: true,
      hook: 'closeBundle',
      targets: [{ src: 'src/assets/icons/*', dest: 'dist/assets/icons' }],
    }),
  ],
  output: [
    {
      file: packageJson.main,
      format: 'esm',
      sourcemap: false,
    },
  ],
  external: [/node_modules/],
});
