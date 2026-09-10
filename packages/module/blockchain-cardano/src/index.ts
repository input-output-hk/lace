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
  voteDelegationTxBuilderAddonContract,
  earnRewardsTxBuilderAddonContract,
  FEATURE_FLAG_CARDANO,
} from '@lace-contract/cardano-context';
import { featureStoreContract } from '@lace-contract/feature';
import { governanceCenterStoreContract } from '@lace-contract/governance-center';
import { inMemoryIntegrationAddonContract } from '@lace-contract/in-memory';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  addressValidatorAddonContract,
  baseTokenAddonContract,
  chainMinimumAmountTokenValidatorAddonContract,
} from '@lace-contract/send-flow';
import { signerFactoryAddonContract } from '@lace-contract/signer';
import { stakingCenterStoreContract } from '@lace-contract/staking-center';
import { syncStoreContract } from '@lace-contract/sync';
import { tokenIdMapperAddonContract } from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';
import { txExecutorImplementationAddonContract } from '@lace-contract/tx-executor';
import {
  walletIdentityAddonContract,
  walletRepoStoreContract,
} from '@lace-contract/wallet-repo';

import store from './store/full';

import type {
  ContractsActionCreators,
  ContractsSelectors,
  LaceModuleMap,
  LaceSideEffect,
  ModuleAddons,
  ModuleStoreActionCreators,
  ModuleStoreSelectors,
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
  chainMinimumAmountTokenValidatorAddonContract,
  addressBookAddressValidatorAddonContract,
  delegationTxBuilderAddonContract,
  cardanoInMemorySigningDependencyContract,
  tokenIdMapperAddonContract,
  deregistrationTxBuilderAddonContract,
  stakingCenterStoreContract,
  governanceCenterStoreContract,
  voteDelegationTxBuilderAddonContract,
  earnRewardsTxBuilderAddonContract,
  walletIdentityAddonContract,
] as const);

const dependsOnContracts = combineContracts([
  featureStoreContract,
  cardanoProviderStoreContract,
  walletRepoStoreContract,
] as const);

const addons = {
  loadInMemoryWalletIntegration: async () =>
    import('./in-memory-wallet-integration'),
  loadAddressValidator: async () => import('./address-validator'),
  loadBaseToken: async () => import('./exposed-modules/base-token-selector'),
  loadChainMinimumAmountTokenValidator: async () =>
    import('./exposed-modules/chain-minimum-amount-token-validator'),
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
  loadVoteDelegationTxBuilder: async () =>
    import('./exposed-modules/vote-delegation-tx-builder'),
  loadEarnRewardsTxBuilder: async () =>
    import('./exposed-modules/earn-rewards-tx-builder'),
  loadAccountUICustomisations: async () =>
    import('./exposed-modules/account-ui-customisation'),
  loadSendFlowSheetUICustomisations: async () =>
    import('./exposed-modules/send-flow-sheet-ui-customization'),
  loadSignerFactory: async () => import('./exposed-modules/signer-factory'),
  loadWalletIdentity: async () => import('./exposed-modules/wallet-identity'),
};

const feature = {
  willLoad: (featureFlags: readonly { key: string }[]) =>
    featureFlags.some(flag => flag.key === FEATURE_FLAG_CARDANO),
  metadata: {
    name: 'Cardano',
    description: 'Cardano blockchain support',
  },
};

const extensionModule = inferModuleContext({
  moduleName: ModuleName('blockchain-cardano'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  feature,
  store,
  addons,
});

// The guest sources Cardano signing from the host (@lace-module/cardano-host-pull's
// HostSignerFactory), so its entry OMITS the in-process signer-factory addon — no
// InMemoryKeyAgent / auth-secret ever runs guest-side for Cardano (ADR 36).
// cardanoInMemorySigning stays provided-but-unused (it has no consumer; keeping it
// provided makes the host-pull switch a swap, not a teardown).
const guestImplementsContracts = combineContracts([
  inMemoryIntegrationAddonContract,
  accountUICustomisationAddonContract,
  sendFlowSheetUICustomisationAddonContract,
  tokensStoreContract,
  addressesStoreContract,
  addressValidatorAddonContract,
  txExecutorImplementationAddonContract,
  activitiesItemCustomizationsAddonContract,
  syncStoreContract,
  baseTokenAddonContract,
  chainMinimumAmountTokenValidatorAddonContract,
  addressBookAddressValidatorAddonContract,
  delegationTxBuilderAddonContract,
  cardanoInMemorySigningDependencyContract,
  tokenIdMapperAddonContract,
  deregistrationTxBuilderAddonContract,
  stakingCenterStoreContract,
  governanceCenterStoreContract,
  voteDelegationTxBuilderAddonContract,
  walletIdentityAddonContract,
] as const);

const { loadSignerFactory: _hostOwnedInGuest, ...guestAddons } = addons;
void _hostOwnedInGuest;

const guestModule = inferModuleContext({
  moduleName: ModuleName('blockchain-cardano'),
  implements: guestImplementsContracts,
  dependsOn: dependsOnContracts,
  feature,
  store,
  addons: guestAddons,
});

const moduleMap: LaceModuleMap = {
  'lace-extension': extensionModule,
  'lace-mobile': extensionModule,
  'lace-extension-guest': guestModule,
};

export default moduleMap;

// Built part-wise, NOT ModuleSelectors/ModuleActionCreators<typeof
// extensionModule>: a `typeof extensionModule` reference makes declaration
// emit (the lace-sdk dts build) serialize the whole inferred LaceModule as
// ONE node, which exceeds the compiler's serialization cap (TS7056).
export type Selectors = ContractsSelectors<typeof dependsOnContracts> &
  ContractsSelectors<typeof implementsContracts> &
  ModuleStoreSelectors<typeof store>;
export type ActionCreators = ContractsActionCreators<
  typeof dependsOnContracts
> &
  ContractsActionCreators<typeof implementsContracts> &
  ModuleStoreActionCreators<typeof store>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
