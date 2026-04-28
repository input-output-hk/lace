import { addressAliasResolverAddonContract } from '@lace-contract/addresses';
import { cardanoProviderStoreContract } from '@lace-contract/cardano-context';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { tokensStoreContract } from '@lace-contract/tokens';

import { ADA_HANDLE_FEATURE_FLAG } from './const';
import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

export * from './const';

const implementsContracts = combineContracts([
  addressAliasResolverAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  cardanoProviderStoreContract,
  tokensStoreContract,
] as const);

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('ada-handle'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {
    loadAddressAliasResolver: async () =>
      import('./exported-modules/address-alias-resolver'),
  },
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === ADA_HANDLE_FEATURE_FLAG),
    metadata: {
      name: 'ada-handle',
      description: 'ADA Handle support',
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
