const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { transformManifest } = require('./webpack-utils');
const Dotenv = require('dotenv-webpack');

module.exports = () => ({
  mode: 'production',
  devtool: false,
  plugins: [
    new Dotenv({
      path: './.env',
      safe: false,
      silent: false,
      defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? '.env.devpreview' : true,
      systemvars: true,
      allowEmptyValues: true,
      override: true
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'manifest.json',
          to: '../manifest.json',
          transform: (content) => transformManifest(content, 'production')
        }
      ]
    })
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        exclude: /(node_modules)/,
        minify: TerserPlugin.swcMinify,
        // the following options are passed to SWC https://swc.rs/docs/configuration/minification
        // Only enable what we need to speedup the build process
        terserOptions: {
          compress: {
            drop_console: process.env.DROP_CONSOLE_IN_PRODUCTION
              ? process.env.DROP_CONSOLE_IN_PRODUCTION === 'true'
              : true,
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
            typeofs: false
          },
          mangle: {
            keepFnNames: true,
            // Required for extension messaging, as it ends up using different mangled
            // class name for the same class in service worker and UI scripts
            keep_classnames: true
          }
        }
      })
    ]
  }
});
