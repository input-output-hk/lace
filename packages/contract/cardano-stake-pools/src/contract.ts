import {
  cardanoProviderDependencyContract,
  cardanoProviderStoreContract,
} from '@lace-contract/cardano-context';
import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

export const cardanoStakePoolsStoreContract = inferContractContext({
  name: ContractName('cardano-stake-pools-store'),
  contractType: 'store',
  instance: 'zero-or-more',
  dependsOn: combineContracts([
    networkStoreContract,
    cardanoProviderStoreContract,
    cardanoProviderDependencyContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<
  typeof cardanoStakePoolsStoreContract
>;
export type ActionCreators = ContractActionCreators<
  typeof cardanoStakePoolsStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
