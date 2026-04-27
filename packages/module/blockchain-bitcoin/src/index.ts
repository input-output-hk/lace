import './augmentations';

import {
  activitiesStoreContract,
  activitiesItemCustomizationsAddonContract,
} from '@lace-contract/activities';
import { addressBookAddressValidatorAddonContract } from '@lace-contract/address-book';
import { addressesStoreContract } from '@lace-contract/addresses';
import {
  accountUICustomisationAddonContract,
  sendFlowSheetUICustomisationAddonContract,
} from '@lace-contract/app';
import {
  BITCOIN_FEATURE_FLAG,
  bitcoinFeeMarketProvider,
  bitcoinProviderContract,
} from '@lace-contract/bitcoin-context';
import { inMemoryIntegrationAddonContract } from '@lace-contract/in-memory';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import {
  addressValidatorAddonContract,
  baseTokenAddonContract,
  sendFlowStoreContract,
} from '@lace-contract/send-flow';
import { signerFactoryAddonContract } from '@lace-contract/signer';
import { syncStoreContract } from '@lace-contract/sync';
import { tokenIdMapperAddonContract } from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';
import { txExecutorImplementationAddonContract } from '@lace-contract/tx-executor';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  inMemoryIntegrationAddonContract,
  accountUICustomisationAddonContract,
  sendFlowSheetUICustomisationAddonContract,
  tokensStoreContract,
  addressesStoreContract,
  syncStoreContract,
  activitiesItemCustomizationsAddonContract,
  txExecutorImplementationAddonContract,
  addressValidatorAddonContract,
  baseTokenAddonContract,
  addressBookAddressValidatorAddonContract,
  tokenIdMapperAddonContract,
  signerFactoryAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  bitcoinProviderContract,
  bitcoinFeeMarketProvider,
  networkStoreContract,
  walletRepoStoreContract,
  activitiesStoreContract,
  tokensStoreContract,
  sendFlowStoreContract,
] as const);

const bitcoinModule = inferModuleContext({
  moduleName: ModuleName('blockchain-bitcoin'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  feature: {
    metadata: { name: 'Bitcoin', description: '' },
    willLoad: featureFlags =>
      featureFlags.map(({ key }) => key).includes(BITCOIN_FEATURE_FLAG),
  },
  addons: {
    loadInMemoryWalletIntegration: async () =>
      import('./in-memory-wallet-integration'),
    loadAddressValidator: async () => import('./address-validator'),
    loadBaseToken: async () => import('./exposed-modules/base-token-selector'),
    loadTxExecutorImplementation: async () =>
      import('./tx-executor-implementation'),
    loadActivitiesItemUICustomisations: async () =>
      import('./exposed-modules/activities-item-ui-customisation'),
    loadAddressBookAddressValidators: async () =>
      import('./exposed-modules/address-book-address-validator'),
    loadTokenIdMapper: async () => import('./exposed-modules/token-id-mapper'),
    loadAccountUICustomisations: async () =>
      import('./exposed-modules/account-ui-customisation'),
    loadSendFlowSheetUICustomisations: async () =>
      import('./exposed-modules/send-flow-sheet-ui-customization'),
    loadSignerFactory: async () => import('./exposed-modules/signer-factory'),
  },
  store,
});

const moduleMap: LaceModuleMap = {
  'lace-extension': bitcoinModule,
  'lace-mobile': bitcoinModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof bitcoinModule>;
export type ActionCreators = ModuleActionCreators<typeof bitcoinModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
