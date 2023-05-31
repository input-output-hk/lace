import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
import typescript from '@rollup/plugin-typescript';
import svgr from '@svgr/rollup';
import { vanillaExtractPlugin } from '@vanilla-extract/rollup-plugin';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

import packageJson from './package.json';

export default () => ({
  input: 'src/index.ts',
  plugins: [
    typescript({
      tsconfig: 'tsconfig.json',
      composite: false,
    }),
    peerDepsExternal(),
    commonjs(),
    image(),
    svgr({ icon: true }),
    vanillaExtractPlugin(),
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
