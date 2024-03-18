import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
import typescript from '@rollup/plugin-typescript';
import svgr from '@svgr/rollup';
import { vanillaExtractPlugin } from '@vanilla-extract/rollup-plugin';
import copy from 'rollup-plugin-copy';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

import { retargetOutputToTmpDirectory as retargetOutputToTemporaryDirectory } from '../../rollup.config';

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
      file: retargetOutputToTemporaryDirectory(packageJson.main),
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: retargetOutputToTemporaryDirectory(packageJson.module),
      format: 'esm',
      sourcemap: true,
    },
  ],
  external: [
    ...Object.keys(packageJson.dependencies),
    /@lace\/icons/,
    /@vanilla-extract/,
  ],
});
