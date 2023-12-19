const { merge } = require('webpack-merge');

const prodConfig = require('./webpack.common.prod');
const appConfig = require('./webpack.common.app');

module.exports = () => merge(prodConfig(), appConfig());
