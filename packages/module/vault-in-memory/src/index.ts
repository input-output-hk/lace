import './augmentations';

import { inMemoryIntegrationAddonContract } from '@lace-contract/in-memory';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import {
  secureStoreAddonContract,
  secureStoreContract,
} from '@lace-contract/secure-store';
import {
  vaultContract,
  walletRepoStoreContract,
} from '@lace-contract/wallet-repo';

import type {
  ModuleActionCreators,
  ModuleSelectors,
  LaceModuleMap,
  ModuleAddons,
} from '@lace-contract/module';

const dependsOnContracts = combineContracts([
  walletRepoStoreContract,
  inMemoryIntegrationAddonContract,
  secureStoreAddonContract,
  secureStoreContract,
  networkStoreContract,
] as const);

const laceMultiPlatformImplementsContracts = combineContracts([
  vaultContract,
] as const);

const laceMultiPlatformModule = inferModuleContext({
  moduleName: ModuleName('vault-in-memory'),
  implements: laceMultiPlatformImplementsContracts,
  dependsOn: dependsOnContracts,
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension': laceMultiPlatformModule,
  'lace-mobile': laceMultiPlatformModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof laceMultiPlatformModule>;
export type ActionCreators = ModuleActionCreators<
  typeof laceMultiPlatformModule
>;
export type AvailableAddons = ModuleAddons<
  typeof dependsOnContracts,
  typeof laceMultiPlatformImplementsContracts
>;
