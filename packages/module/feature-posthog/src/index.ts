import './augmentations';

import { analyticsStoreContract } from '@lace-contract/analytics';
import { appStoreContract } from '@lace-contract/app';
import {
  featureStoreContract,
  featureDependencyContract,
  FEATURES_DEV_FEATURE_FLAG,
} from '@lace-contract/feature';
import { i18nDependencyContract } from '@lace-contract/i18n';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { posthogDependencyContract } from '@lace-contract/posthog';
import { storageDependencyContract } from '@lace-contract/storage';
import { viewsStoreContract } from '@lace-contract/views';

import { FEATURE_FLAG_FEATURES_POSTHOG } from './const';
import store from './store';

import type {
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  LaceModuleMap,
} from '@lace-contract/module';

export { FEATURE_FLAG_FEATURES_POSTHOG } from './const';

const extensionModule = inferModuleContext({
  moduleName: ModuleName('feature-posthog'),
  implements: combineContracts([
    featureStoreContract,
    featureDependencyContract,
  ] as const),
  dependsOn: combineContracts([
    analyticsStoreContract,
    appStoreContract,
    i18nDependencyContract,
    posthogDependencyContract,
    storageDependencyContract,
    viewsStoreContract,
  ] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_FEATURES_POSTHOG) &&
      !featureFlags.some(flag => flag.key === FEATURES_DEV_FEATURE_FLAG),
    metadata: {
      name: 'PostHog Feature Management',
      description: 'Feature flag management through PostHog',
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
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
