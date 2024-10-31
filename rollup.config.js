import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import svgr from '@svgr/rollup';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import { sentryRollupPlugin } from '@sentry/rollup-plugin';
import dotenv from 'dotenv';

dotenv.config({
  path: '../../.env',
  encoding: 'utf8'
});

const defaultTsPluginOptions = {
  composite: false,
  exclude: ['**/*.stories.tsx', '**/*.test.ts', '**/*.test.tsx'],
  tsconfig: 'src/tsconfig.json',
}

const hasSentryReleaseConfig =
  !!process.env.SENTRY_AUTH_TOKEN && !!process.env.SENTRY_ORG && !!process.env.SENTRY_PROJECT;

export default ({
  tsPluginOptions = defaultTsPluginOptions,
  input = 'src/index.ts',
} = {}) => ({
  external: [/node_modules/],
  input,
  plugins: [
    resolve({
      preferBuiltins: false,
    }),
    typescript({
      ...defaultTsPluginOptions,
      ...tsPluginOptions,
    }),
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
    // Put the Sentry rollup plugin after all other plugins
    ...(hasSentryReleaseConfig
      ? [
        sentryRollupPlugin({
          authToken: process.env.SENTRY_AUTH_TOKEN,
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          telemetry: false,
          url: 'https://sentry.io/'
        })
      ]
      : [])
  ],
});
