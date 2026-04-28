import { accountSettingsUIAddonContract } from '@lace-contract/account-management';
import { addressesStoreContract } from '@lace-contract/addresses';
import { BITCOIN_FEATURE_FLAG } from '@lace-contract/bitcoin-context';
import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

const extensionModule = inferModuleContext({
  moduleName: ModuleName('blockchain-bitcoin-ui'),
  implements: combineContracts([accountSettingsUIAddonContract] as const),
  dependsOn: combineContracts([
    addressesStoreContract,
    featureStoreContract,
  ] as const),
  addons: {
    loadAccountSettingsUICustomisations: async () =>
      import('./addons/account-settings'),
  },
  feature: {
    metadata: { name: 'Bitcoin-UI', description: 'UI module for Bitcoin' },
    willLoad: featureFlags =>
      featureFlags.map(({ key }) => key).includes(BITCOIN_FEATURE_FLAG),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': extensionModule,
  'lace-extension': extensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
