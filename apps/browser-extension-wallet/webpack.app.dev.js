const { merge } = require('webpack-merge');

const createDevConfig = require('./webpack.common.dev');
const appConfig = require('./webpack.common.app');

module.exports = (env) => merge(createDevConfig({ devServerPort: 3001 })(env), appConfig());
