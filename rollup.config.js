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
    exclude: ['**/*.stories.tsx']
  }
} = {}) => ({
  input: 'src/index.ts',
  plugins: [
    resolve({
      preferBuiltins: false,
    }),
    typescript(tsPluginOptions),
    peerDepsExternal(),
    postcss(),
    commonjs(),
    nodePolyfills(),
    image(),
    svgr({ icon: true })
  ],
  external: [/node_modules/]
});
