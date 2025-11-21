import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import image from '@rollup/plugin-image';
import json from '@rollup/plugin-json';
import packageJson from './package.json';
import svgr from '@svgr/rollup';
import copy from 'rollup-plugin-copy';
import url from '@rollup/plugin-url';
import postcss from 'rollup-plugin-postcss';

const common = {
  plugins: [
    typescript({
      tsconfig: './src/tsconfig.json',
      composite: false,
      sourceMap: true,
      inlineSources: true,
    }),
    json(),
    commonjs(),
    postcss({
      // postcss plugin includes always path to the es version of the style-inject
      // no matter what build type it is. It makes cjs build requiring esm version
      // https://github.com/egoist/rollup-plugin-postcss/issues/381
      // https://github.com/egoist/rollup-plugin-postcss/issues/367
      inject: cssVariableName => `
import styleInject from 'style-inject';
styleInject(${cssVariableName});`,
    }),
    image(),
    svgr(),
    copy({
      targets: [{ src: 'src/assets', dest: 'dist' }],
    }),
    url({
      limit: 0,
      include: ['**/*.mp4'],
      emitFiles: true,
      fileName: '[name][extname]'
    }),
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
