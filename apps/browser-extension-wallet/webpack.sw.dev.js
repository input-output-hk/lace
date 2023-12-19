const { merge } = require('webpack-merge');

const createDevConfig = require('./webpack.common.dev');
const swConfig = require('./webpack.common.sw');

module.exports = (env) => merge(createDevConfig({ devServerPort: 3000 })(env), swConfig());
