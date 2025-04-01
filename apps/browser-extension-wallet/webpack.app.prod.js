const TerserPlugin = require('terser-webpack-plugin');
const { merge } = require('webpack-merge');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const commonProdConfig = require('./webpack.common.prod');
const commonAppConfig = require('./webpack.common.app');

require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults'
});

module.exports = () =>
  merge(commonProdConfig(), commonAppConfig(), {
    optimization: {
      mangleExports: false,
      minimize: true,
      moduleIds: 'named',
      splitChunks: {
        maxSize: 3000000,
        cacheGroups: {
          vendors: {
            test: /[/\\]node_modules[/\\]/,
            name: () => 'vendors',
            enforce: true,
            priority: -20,
            chunks: 'all',
            reuseExistingChunk: true
          }
        }
      },
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
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        reportFilename: 'report.html',
        openAnalyzer: false
      })
    ]
  });
