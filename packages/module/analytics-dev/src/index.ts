import {
  analyticsStoreContract,
  analyticsProviderDependencyContract,
} from '@lace-contract/analytics';
import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
  isProductionEnvironment,
} from '@lace-contract/module';

import { ANALYTICS_DEV_FEATURE_FLAG } from './const';
import store from './store';

import type * as _ from '@lace-contract/feature';
import type {
  ModuleActionCreators,
  ModuleSelectors,
  LaceModuleMap,
} from '@lace-contract/module';

export { ANALYTICS_DEV_FEATURE_FLAG } from './const';

const extensionModule = inferModuleContext({
  moduleName: ModuleName('analytics-dev'),
  implements: combineContracts([
    analyticsStoreContract,
    analyticsProviderDependencyContract,
  ] as const),
  dependsOn: combineContracts([featureStoreContract] as const),
  store,
  feature: {
    willLoad: (featureFlags, environment) =>
      !isProductionEnvironment(environment) &&
      featureFlags.some(flag => flag.key === ANALYTICS_DEV_FEATURE_FLAG),
    metadata: {
      name: 'AnalyticsDev',
      description: 'Development mode analytics module',
    },
  },
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension': extensionModule,
  'lace-mobile': extensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;
