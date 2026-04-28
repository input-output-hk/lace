import './augmentations';

import { FeatureFlagKey, featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { notificationCenterStoreContract } from '@lace-contract/notification-center';
import {
  viewsStoreContract,
  stackPagesAddonContract,
  tabPagesAddonContract,
} from '@lace-contract/views';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  notificationCenterStoreContract,
  stackPagesAddonContract,
  tabPagesAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  featureStoreContract,
  viewsStoreContract,
] as const);

const multiPlatformModule = inferModuleContext({
  addons: {
    loadStackPages: async () => import('./addons/stackPages'),
    loadTabPages: async () => import('./addons/tabPages'),
  },
  dependsOn: dependsOnContracts,
  implements: implementsContracts,
  moduleName: ModuleName('notification-center'),
  store,
  feature: {
    metadata: {
      name: 'Notifications Center',
      description: 'Module for managing notifications in the application',
    },
    willLoad: (featureFlags, _environment) => {
      return featureFlags.some(
        flag => flag.key === FeatureFlagKey('NOTIFICATION_CENTER'),
      );
    },
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': multiPlatformModule,
  'lace-mobile': multiPlatformModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof multiPlatformModule>;
export type ActionCreators = ModuleActionCreators<typeof multiPlatformModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;

export * from './types';
