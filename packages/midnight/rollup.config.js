import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import image from '@rollup/plugin-image';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';
import svgr from '@svgr/rollup';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';

import packageJson from './package.json';

const baseConfig = (tsConfigPath) => ({
  input: 'src/index.ts',
  plugins: [
    resolve({
      preferBuiltins: false
    }),
    typescript({
      tsconfig: tsConfigPath ?? 'src/tsconfig.json',
      composite: false
    }),
    peerDepsExternal(),
    postcss(),
    commonjs(),
    image(),
    svgr({ icon: true }),
    copy({
      targets: [{ src: 'src/ui/lib/translations/en.json', dest: 'dist/translations/' }]
    }),
    json()
  ],
  external: [/node_modules/]
});

export default () => [
  {
    ...baseConfig('src/tsconfig.build.json'),
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true
      }
    ]
  }
];
