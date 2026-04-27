import { addressesStoreContract } from '@lace-contract/addresses';
import { analyticsStoreContract } from '@lace-contract/analytics';
import { appStoreContract } from '@lace-contract/app';
// Cardano-specific: needed for UTXOs in swap TX building.
// TODO: abstract when adding cross-chain swap support.
import { cardanoProviderStoreContract } from '@lace-contract/cardano-context';
import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import { swapProviderDependencyContract } from '@lace-contract/swap-provider';
import { tokensStoreContract } from '@lace-contract/tokens';
import { txExecutorStoreContract } from '@lace-contract/tx-executor';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

export const swapContextStoreContract = inferContractContext({
  name: ContractName('swap-context-store'),
  contractType: 'store',
  instance: 'exactly-one',
  dependsOn: combineContracts([
    addressesStoreContract,
    analyticsStoreContract,
    appStoreContract,
    cardanoProviderStoreContract,
    swapProviderDependencyContract,
    walletRepoStoreContract,
    networkStoreContract,
    txExecutorStoreContract,
    tokensStoreContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof swapContextStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof swapContextStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
