import './augmentations';

import { FEATURES_DEV_FEATURE_FLAG } from '@lace-contract/feature';
import {
  inferModuleContext,
  ModuleName,
  isProductionEnvironment,
} from '@lace-contract/module';

import { implementsContracts } from './contracts';
import store from './store';

import type { LaceModuleMap } from '@lace-contract/module';

export { FEATURES_DEV_FEATURE_FLAG } from '@lace-contract/feature';

const extensionModule = inferModuleContext({
  moduleName: ModuleName('feature-dev'),
  implements: implementsContracts,
  store,
  feature: {
    willLoad: (featureFlags, environment) =>
      !isProductionEnvironment(environment) &&
      featureFlags.some(flag => flag.key === FEATURES_DEV_FEATURE_FLAG),
    metadata: {
      name: 'FeatureDev',
      description: 'Development mode features module',
    },
  },
  addons: {
    loadInitializeExtensionView: async () =>
      import('./initialize-extension-view'),
  },
});

// The extension-shell guest has no PostHog wiring, so feature-dev is its only
// feature-store implementation and must load in production builds too —
// flag-gated only, without the environment gate.
const guestModule = inferModuleContext({
  moduleName: ModuleName('feature-dev'),
  implements: implementsContracts,
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURES_DEV_FEATURE_FLAG),
    metadata: {
      name: 'FeatureDev',
      description: 'Development mode features module',
    },
  },
  addons: {
    loadInitializeExtensionView: async () =>
      import('./initialize-extension-view'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': extensionModule,
  'lace-mobile': extensionModule,
  'lace-extension-carbon': guestModule,
  'lace-extension-guest': guestModule,
};

export default moduleMap;

export type {
  ActionCreators,
  AvailableAddons,
  Selectors,
  SideEffect,
} from './contracts';
