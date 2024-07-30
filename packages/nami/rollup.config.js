import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import css from 'rollup-plugin-import-css';
import image from '@rollup/plugin-image';
import json from '@rollup/plugin-json';
import packageJson from './package.json';
import svgr from '@svgr/rollup';

export default () => ({
  input: 'src/index.ts',
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
