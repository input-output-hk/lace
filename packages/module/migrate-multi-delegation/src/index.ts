import './augmentations';

import { addressesStoreContract } from '@lace-contract/addresses';
import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
import { cardanoProviderStoreContract } from '@lace-contract/cardano-context';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { signerStoreContract } from '@lace-contract/signer';
import { globalOverlaysAddonContract } from '@lace-contract/views';

import { MD_MIGRATION_FEATURE_FLAG } from './const';
import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
  ActionType,
} from '@lace-contract/module';
export * from './const';

const implementsContracts = combineContracts([
  globalOverlaysAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  authenticationPromptStoreContract,
  addressesStoreContract,
  cardanoProviderStoreContract,
  signerStoreContract,
] as const);

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('migrate-multi-delegation'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {
    loadGlobalOverlays: async () => import('./addons/load-global-overlays'),
  },
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === MD_MIGRATION_FEATURE_FLAG),
    metadata: {
      name: 'migrate-multi-delegation',
      description: 'Lace multi-delegation->single-delegation migration',
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
export type Action = ActionType<ActionCreators>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
