import './augmentations';

import {
  analyticsStoreContract,
  analyticsProviderDependencyContract,
} from '@lace-contract/analytics';
import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { posthogDependencyContract } from '@lace-contract/posthog';

import { FEATURE_FLAG_ANALYTICS_POSTHOG } from './const';
import store from './store';

import type {
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  LaceModuleMap,
} from '@lace-contract/module';

export { FEATURE_FLAG_ANALYTICS_POSTHOG } from './const';

const analyticsPosthogModule = inferModuleContext({
  moduleName: ModuleName('analytics-posthog'),
  implements: combineContracts([
    analyticsStoreContract,
    analyticsProviderDependencyContract,
  ] as const),
  dependsOn: combineContracts([
    featureStoreContract,
    posthogDependencyContract,
  ] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_ANALYTICS_POSTHOG),
    metadata: {
      name: 'PostHog Analytics',
      description: 'Track analytics events in PostHog',
    },
  },
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension': analyticsPosthogModule,
  'lace-mobile': analyticsPosthogModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof analyticsPosthogModule>;
export type ActionCreators = ModuleActionCreators<
  typeof analyticsPosthogModule
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
