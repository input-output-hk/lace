import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

import packageJson from './package.json';

export default () => ({
  input: 'src/index.ts',
  plugins: [
    typescript({
      tsconfig: './src/tsconfig.json',
      composite: false,
    }),
    commonjs(),
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
