import { appLockStoreContract } from '@lace-contract/app-lock';
import { appLockSetupAddon } from '@lace-contract/app-lock';
import { dappConnectorStoreContract } from '@lace-contract/dapp-connector';
import { FeatureFlagKey } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  globalOverlaysAddonContract,
  viewsStoreContract,
} from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';
import './augmentations';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

export const V1_MIGRATION_FEATURE_FLAG = FeatureFlagKey('V1_MIGRATION');

const implementsContracts = combineContracts([
  globalOverlaysAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  appLockStoreContract,
  dappConnectorStoreContract,
  viewsStoreContract,
  walletRepoStoreContract,
  appLockSetupAddon,
] as const);

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('migrate-v1-data'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {
    loadGlobalOverlays: async () => import('./addons/load-global-overlays'),
  },
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === V1_MIGRATION_FEATURE_FLAG),
    metadata: {
      name: 'migrate-v1-data',
      description: 'Lace v1->v2 data migration',
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
