import { activitiesItemCustomizationsAddonContract } from '@lace-contract/activities';
import { addressBookAddressValidatorAddonContract } from '@lace-contract/address-book';
import { addressesStoreContract } from '@lace-contract/addresses';
import { sendFlowSheetUICustomisationAddonContract } from '@lace-contract/app';
import {
  cardanoInMemorySigningDependencyContract,
  cardanoProviderStoreContract,
  delegationTxBuilderAddonContract,
  deregistrationTxBuilderAddonContract,
  voteDelegationTxBuilderAddonContract,
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

import type { LaceModuleMap } from '@lace-contract/module';

// The state-only arm of this module: the same store, the same dependencies and
// the same logic addons as the guest entry, WITHOUT the account UI
// customisation. That customisation's extra-actions entry is a react-native
// component, and an addon thunk is a live property of the module object — no
// static analysis can drop it, so an ESM bundler emits a chunk for it and parses
// the whole react-native chain behind it. A DOM guest therefore cannot consume
// `./index` at all; it consumes this entry and renders its own designation UI
// over the same redux state.
//
// The contract lists are stated again here rather than shared with `./index`:
// sharing them would make the default entry import this file, and the two
// `implements` lists genuinely differ (`addons` is required for every contract a
// module implements). Drift fails loudly — `assertModuleCompatibility` throws at
// the guest's boot.
const implementsContracts = combineContracts([
  inMemoryIntegrationAddonContract,
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

const dependsOnContracts = combineContracts([
  featureStoreContract,
  cardanoProviderStoreContract,
  walletRepoStoreContract,
] as const);

const stateModule = inferModuleContext({
  moduleName: ModuleName('blockchain-cardano'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  feature: {
    willLoad: (featureFlags: readonly { key: string }[]) =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_CARDANO),
    metadata: {
      name: 'Cardano',
      description: 'Cardano blockchain support',
    },
  },
  store,
  // Signing is host-owned in the guest (ADR 36), so the in-process
  // signer-factory addon is absent here for the same reason it is absent from
  // `./index`'s guest entry.
  addons: {
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
    loadSendFlowSheetUICustomisations: async () =>
      import('./exposed-modules/send-flow-sheet-ui-customization'),
    loadWalletIdentity: async () => import('./exposed-modules/wallet-identity'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension-carbon': stateModule,
};

export default moduleMap;
