import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import svgr from '@svgr/rollup';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';

export default ({
  tsPluginOptions = {
    composite: false,
    exclude: ['**/*.stories.tsx', '**/*.test.ts', '**/*.test.tsx'],
    tsconfig: 'src/tsconfig.json',
  },
} = {}) => ({
  external: [/node_modules/],
  input: 'src/index.ts',
  plugins: [
    resolve({
      preferBuiltins: false,
    }),
    typescript(tsPluginOptions),
    peerDepsExternal(),
    postcss({
      // postcss plugin includes always path to the es version of the style-inject
      // no matter what build type it is. It makes cjs build requiring esm version
      // https://github.com/egoist/rollup-plugin-postcss/issues/381
      // https://github.com/egoist/rollup-plugin-postcss/issues/367
      inject: (cssVariableName) => `
import styleInject from 'style-inject';
styleInject(${cssVariableName});`,
    }),
    commonjs(),
    nodePolyfills(),
    image(),
    svgr({ icon: true }),
  ],
});
