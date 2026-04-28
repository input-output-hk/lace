import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

export const txExecutorImplementationAddonContract = inferContractContext({
  name: ContractName('tx-executor-implementation-addon'),
  instance: 'at-least-one',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadTxExecutorImplementation'],
  },
});

export const txExecutorStoreContract = inferContractContext({
  name: ContractName('tx-executor-store'),
  instance: 'exactly-one',
  contractType: 'store',
  dependsOn: combineContracts([
    authenticationPromptStoreContract,
    walletRepoStoreContract,
    txExecutorImplementationAddonContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof txExecutorStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof txExecutorStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
