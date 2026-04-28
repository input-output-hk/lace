import { ConfigPlugin } from 'expo/config-plugins';
import {
  withApolloSetup,
  withAppDelegateFix,
  withPodDependencies,
} from './ios';
import { withAndroidApolloDependencies } from './android';

const withPlugins: ConfigPlugin = config => {
  config = withApolloSetup(config);
  config = withAppDelegateFix(config); // Fix AppDelegate bundle root
  config = withPodDependencies(config);
  config = withAndroidApolloDependencies(config);
  return config;
};
export default withPlugins;
