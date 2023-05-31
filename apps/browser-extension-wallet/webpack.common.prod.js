const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { transformManifest } = require('./webpack-utils');
require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: './.env.defaults'
});

module.exports = () => ({
  mode: 'production',
  devtool: false,
  plugins: [
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
            keepFnNames: true
          }
        }
      })
    ]
  }
});
