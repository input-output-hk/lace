const Dotenv = require('dotenv-webpack');
const TerserPlugin = require('terser-webpack-plugin');

require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
});

module.exports = () => ({
  mode: 'production',
  devtool: 'source-map',
  performance: {
    // images/videos might be larger
    maxAssetSize: 30_000_000,
    // Mozilla doesn't allow assets larger than 4M
    maxEntrypointSize: 4_000_000,
    hints: 'error'
  },
  optimization: {
    mangleExports: false,
    minimize: true,
    moduleIds: 'named',
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
            unused: false,
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
  },
  plugins: [
    new Dotenv({
      path: '.env',
      safe: false,
      silent: false,
      defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? '.env.developerpreview' : true,
      systemvars: true,
      allowEmptyValues: true
    })
  ]
});
