import { addressBookStoreContract } from '@lace-contract/address-book';
import { addressesStoreContract } from '@lace-contract/addresses';
import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import { sendFlowStoreContract } from '@lace-contract/send-flow';
import { tokenPricingStoreContract } from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';
import { sheetPagesAddonContract } from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  sheetPagesAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  sendFlowStoreContract,
  walletRepoStoreContract,
  featureStoreContract,
  networkStoreContract,
  tokensStoreContract,
  tokenPricingStoreContract,
  addressesStoreContract,
  addressBookStoreContract,
] as const);

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('send-flow'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  addons: {
    loadSheetPages: async () => import('./addons/sheetPages'),
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
