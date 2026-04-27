const {
  withApolloSetup,
  withAppDelegateFix,
  withPodDependencies,
} = require('./ios');
const { withAndroidApolloDependencies } = require('./android');

const withPlugins = config => {
  config = withApolloSetup(config);
  config = withAppDelegateFix(config);
  config = withPodDependencies(config);
  config = withAndroidApolloDependencies(config);
  return config;
};

module.exports = withPlugins;
