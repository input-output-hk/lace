import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import css from 'rollup-plugin-import-css';
import image from '@rollup/plugin-image';
import json from '@rollup/plugin-json';
import packageJson from './package.json';
import svgr from '@svgr/rollup';

const common = {
  plugins: [
    typescript({
      tsconfig: './src/tsconfig.json',
      composite: false,
    }),
    json(),
    commonjs(),
    css(),
    image(),
    svgr(),
  ],
  external: [/node_modules/],
};

export default () => [
  {
    ...common,
    input: 'src/adapters/index.ts',
    output: [
      {
        file: 'dist/adapters/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/adapters/index.esm.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
  },
  {
    ...common,
    input: 'src/index.ts',
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
  },
];
