const TerserPlugin = require('terser-webpack-plugin');
const { merge } = require('webpack-merge');

const { baseConfig } = require('../base/common.webpack.config');

module.exports = merge(baseConfig, {
  mode: 'production',
  devtool: 'source-map',
  optimization: {
    minimizer: [
      new TerserPlugin({
        exclude: /(node_modules)/,
        minify: TerserPlugin.swcMinify,
        extractComments: false,
        terserOptions: {
          compress: {
            drop_console: false,
            drop_debugger: true,
            unused: true,
            arrows: false,
            booleans: false,
            collapse_vars: false,
            comparisons: false,
            computed_props: false,
            conditionals: false,
            defaults: false,
            directives: false,
            evaluate: false,
            hoist_props: false,
            if_return: false,
            join_vars: false,
            loops: false,
            negate_iife: false,
            properties: false,
            sequences: false,
            side_effects: false,
            switches: false,
            toplevel: false,
            typeofs: false,
          },
          mangle: {
            keepFnNames: true,
            // Required for extension messaging, as it ends up using different mangled
            // class name for the same class in service worker and UI scripts
            keep_classnames: true,
          },
        },
      }),
    ],
  },
});
