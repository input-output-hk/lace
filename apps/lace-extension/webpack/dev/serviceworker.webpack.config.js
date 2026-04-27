const { merge } = require('webpack-merge');

const swConfig = require('../base/serviceworker.webpack.config');

const baseConfig = require('./common.webpack.config');

module.exports = merge(baseConfig, swConfig);
