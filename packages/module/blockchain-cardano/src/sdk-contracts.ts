// The contracts the SDK's Cardano module implements and depends on, and the
// types its store is written against in the stable SDK build (contracts.stable.ts).
import { addressBookAddressValidatorAddonContract } from '@lace-contract/address-book';
import { addressesStoreContract } from '@lace-contract/addresses';
import {
  cardanoInMemorySigningDependencyContract,
  cardanoProviderStoreContract,
  delegationTxBuilderAddonContract,
  deregistrationTxBuilderAddonContract,
  voteDelegationTxBuilderAddonContract,
  earnRewardsTxBuilderAddonContract,
} from '@lace-contract/cardano-context';
import { featureStoreContract } from '@lace-contract/feature';
// TODO: re-add once auth prompt is decoupled from react-native
//tx-executor → authentication-prompt → react-native.
// import { governanceCenterStoreContract } from '@lace-contract/governance-center';
import { inMemoryIntegrationAddonContract } from '@lace-contract/in-memory';
import { combineContracts } from '@lace-contract/module';
// TODO: re-add addressValidatorAddonContract and baseTokenAddonContract once
// @lace-contract/send-flow barrel is decoupled from react-native.
// Chain: send-flow → tx-executor → authentication-prompt → react-native.
import { signerFactoryAddonContract } from '@lace-contract/signer';
// TODO: re-add stakingCenterStoreContract once decoupled from react-native.
// Chain: staking-center → tx-executor → authentication-prompt → react-native.
import { syncStoreContract } from '@lace-contract/sync';
import { tokenIdMapperAddonContract } from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';
// TODO: re-add txExecutorImplementationAddonContract once @lace-contract/tx-executor
// barrel is decoupled from @lace-contract/authentication-prompt (react-native).
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import type store from './store';
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
  tokensStoreContract,
  addressesStoreContract,
  signerFactoryAddonContract,
  syncStoreContract,
  addressBookAddressValidatorAddonContract,
  delegationTxBuilderAddonContract,
  cardanoInMemorySigningDependencyContract,
  tokenIdMapperAddonContract,
  deregistrationTxBuilderAddonContract,
  // governanceCenterStoreContract,
  voteDelegationTxBuilderAddonContract,
  earnRewardsTxBuilderAddonContract,
] as const);

export const dependsOnContracts = combineContracts([
  featureStoreContract,
  cardanoProviderStoreContract,
  walletRepoStoreContract,
] as const);

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
