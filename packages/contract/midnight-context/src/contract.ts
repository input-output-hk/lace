import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  ContractName,
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

export const midnightContextStoreContract = inferContractContext({
  name: ContractName('midnight-context-store'),
  instance: 'exactly-one',
  contractType: 'store',
  dependsOn: combineContracts([
    networkStoreContract,
    featureStoreContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

// Provides midnight dependencies to side effects
// SideEffectDependencies: midnightWallets$, stopAllMidnightWallets, startMidnightAccountWallet
export const midnightDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('midnight-dependency'),
  instance: 'exactly-one',
});

export type Selectors = ContractSelectors<typeof midnightContextStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof midnightContextStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
