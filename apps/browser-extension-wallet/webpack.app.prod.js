const { merge } = require('webpack-merge');

const prodConfig = require('./webpack.common.prod');
const appConfig = require('./webpack.common.app');

let processEnvs = process.env;
console.log('--PROCESS ENVS--');
console.log(processEnvs);

require('dotenv-defaults').config({
  path: './.env',
  encoding: 'utf8',
  defaults: process.env.BUILD_DEV_PREVIEW === 'true' ? './.env.developerpreview' : './.env.defaults',
  overwrite: true
});

if (processEnvs.CI === 'true') {
  process.env = {
    ...process.env,
    ...processEnvs
  };
  console.log('--PROCESS ENVS 2--');
  console.log(process.env);
}

module.exports = () => merge(prodConfig(), appConfig());
