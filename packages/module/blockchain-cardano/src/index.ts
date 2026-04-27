export * from './value-objects';

import { activitiesItemCustomizationsAddonContract } from '@lace-contract/activities';
import { addressBookAddressValidatorAddonContract } from '@lace-contract/address-book';
import { addressesStoreContract } from '@lace-contract/addresses';
import {
  accountUICustomisationAddonContract,
  sendFlowSheetUICustomisationAddonContract,
} from '@lace-contract/app';
import {
  cardanoInMemorySigningDependencyContract,
  cardanoProviderStoreContract,
  delegationTxBuilderAddonContract,
  deregistrationTxBuilderAddonContract,
  FEATURE_FLAG_CARDANO,
} from '@lace-contract/cardano-context';
import { featureStoreContract } from '@lace-contract/feature';
import { inMemoryIntegrationAddonContract } from '@lace-contract/in-memory';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  addressValidatorAddonContract,
  baseTokenAddonContract,
} from '@lace-contract/send-flow';
import { signerFactoryAddonContract } from '@lace-contract/signer';
import { stakingCenterStoreContract } from '@lace-contract/staking-center';
import { syncStoreContract } from '@lace-contract/sync';
import { tokenIdMapperAddonContract } from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';
import { txExecutorImplementationAddonContract } from '@lace-contract/tx-executor';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  LaceModuleMap,
  LaceSideEffect,
  ModuleActionCreators,
  ModuleAddons,
  ModuleSelectors,
} from '@lace-contract/module';

export { FEATURE_FLAG_CARDANO } from '@lace-contract/cardano-context';

const implementsContracts = combineContracts([
  inMemoryIntegrationAddonContract,
  accountUICustomisationAddonContract,
  sendFlowSheetUICustomisationAddonContract,
  tokensStoreContract,
  addressesStoreContract,
  signerFactoryAddonContract,
  addressValidatorAddonContract,
  txExecutorImplementationAddonContract,
  activitiesItemCustomizationsAddonContract,
  syncStoreContract,
  baseTokenAddonContract,
  addressBookAddressValidatorAddonContract,
  delegationTxBuilderAddonContract,
  cardanoInMemorySigningDependencyContract,
  tokenIdMapperAddonContract,
  deregistrationTxBuilderAddonContract,
  stakingCenterStoreContract,
] as const);

const dependsOnContracts = combineContracts([
  featureStoreContract,
  cardanoProviderStoreContract,
  walletRepoStoreContract,
] as const);

const extensionModule = inferModuleContext({
  moduleName: ModuleName('blockchain-cardano'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_CARDANO),
    metadata: {
      name: 'Cardano',
      description: 'Cardano blockchain support',
    },
  },
  store,
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
    loadDelegationTxBuilder: async () =>
      import('./exposed-modules/delegation-tx-builder'),
    loadTokenIdMapper: async () => import('./exposed-modules/token-id-mapper'),
    loadDeregistrationTxBuilder: async () =>
      import('./exposed-modules/deregistration-tx-builder'),
    loadAccountUICustomisations: async () =>
      import('./exposed-modules/account-ui-customisation'),
    loadSendFlowSheetUICustomisations: async () =>
      import('./exposed-modules/send-flow-sheet-ui-customization'),
    loadSignerFactory: async () => import('./exposed-modules/signer-factory'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': extensionModule,
  'lace-mobile': extensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
