import './augmentations';

import { addressesStoreContract } from '@lace-contract/addresses';
import { appStoreContract } from '@lace-contract/app';
import { FeatureFlagKey, featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  stackPagesAddonContract,
  mobileDeepLinksAddonContract,
} from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  LaceModuleMap,
  LaceSideEffect,
  ModuleActionCreators,
  ModuleSelectors,
  ModuleAddons,
} from '@lace-contract/module';
const implementsContracts = combineContracts([
  stackPagesAddonContract,
  mobileDeepLinksAddonContract,
] as const);

const dependsOnContracts = combineContracts([
  featureStoreContract,
  appStoreContract,
  walletRepoStoreContract,
  addressesStoreContract,
] as const);

const mobilePlatformModule = inferModuleContext({
  moduleName: ModuleName('cardano-uri-linking'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(
        flag => flag.key === FeatureFlagKey('CARDANO_URI_LINKING'),
      ),
    metadata: {
      name: 'CIP-0013 Module',
      description: 'A way to handle CIP-0013 URIs',
    },
  },
  addons: {
    loadStackPages: async () => import('./addons/stackPages'),
    loadMobileDeepLinks: async () => import('./linking'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': mobilePlatformModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof mobilePlatformModule>;
export type ActionCreators = ModuleActionCreators<typeof mobilePlatformModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
