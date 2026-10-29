// The contracts the Cardano module implements and depends on in the apps, and
// the types its store is written against.
// The stable SDK build resolves contracts.stable.ts in place of this file, which
// types the store against the contracts the SDK's module loads.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.
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
} from '@lace-contract/cardano-context';
import { featureStoreContract } from '@lace-contract/feature';
import { governanceCenterStoreContract } from '@lace-contract/governance-center';
import { inMemoryIntegrationAddonContract } from '@lace-contract/in-memory';
import { combineContracts } from '@lace-contract/module';
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

import type store from './store/full';
import type {
  ContractsActionCreators,
  ContractsSelectors,
  LaceSideEffect,
  ModuleAddons,
  ModuleStoreActionCreators,
  ModuleStoreSelectors,
} from '@lace-contract/module';

export const implementsContracts = combineContracts([
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

export const dependsOnContracts = combineContracts([
  featureStoreContract,
  cardanoProviderStoreContract,
  walletRepoStoreContract,
] as const);

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
