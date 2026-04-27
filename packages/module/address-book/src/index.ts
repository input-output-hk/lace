import {
  addressBookStoreContract,
  addressBookAddressValidatorAddonContract,
  FEATURE_FLAG_ADDRESS_BOOK,
} from '@lace-contract/address-book';
import { addressAliasResolverAddonContract } from '@lace-contract/addresses';
import { appStoreContract } from '@lace-contract/app';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import {
  sheetPagesAddonContract,
  tabPagesAddonContract,
} from '@lace-contract/views';

import type * as _ from '@lace-contract/feature';
import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleAddons,
  ModuleSelectors,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  tabPagesAddonContract,
  sheetPagesAddonContract,
] as const);

const dependsOnContracts = combineContracts([
  appStoreContract,
  addressBookAddressValidatorAddonContract,
  addressBookStoreContract,
  addressAliasResolverAddonContract,
  networkStoreContract,
] as const);

const sharedModule = inferModuleContext({
  moduleName: ModuleName('address-book'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_ADDRESS_BOOK),
    metadata: {
      name: 'AddressBook',
      description: 'Contact management for blockchain addresses',
    },
  },
  addons: {
    loadTabPages: async () => import('./addons/tabPages'),
    loadSheetPages: async () => import('./addons/sheetPages'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': sharedModule,
  'lace-mobile': sharedModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof sharedModule>;
export type ActionCreators = ModuleActionCreators<typeof sharedModule>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
