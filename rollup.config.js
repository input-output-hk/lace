import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import image from '@rollup/plugin-image';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import svgr from '@svgr/rollup';

export default ({
  tsPluginOptions = {
    tsconfig: 'src/tsconfig.json',
    composite: false,
    exclude: ['node_modules', '**/*.stories.tsx', '**/*.test.ts', '**/*.test.tsx']
  }
} = {}) => ({
  input: 'src/index.ts',
  plugins: [
    resolve({
      preferBuiltins: false
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
styleInject(${cssVariableName});`
    }),
    commonjs(),
    nodePolyfills(),
    image(),
    svgr({ icon: true })
  ],
  external: [/node_modules/]
});
