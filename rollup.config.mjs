import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import svgr from '@svgr/rollup';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';

const defaultTsPluginOptions = {
  composite: false,
  exclude: ['**/*.stories.tsx', '**/*.test.ts', '**/*.test.tsx'],
  tsconfig: 'src/tsconfig.json'
};

export default ({ tsPluginOptions = defaultTsPluginOptions, input = 'src/index.ts' } = {}) => ({
  external: [/node_modules/],
  input,
  plugins: [
    resolve({
      preferBuiltins: false
    }),
    typescript({
      ...defaultTsPluginOptions,
      ...tsPluginOptions
    }),
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
  ]
});
