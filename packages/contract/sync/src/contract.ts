import {
  ContractName,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

export const syncStoreContract = inferContractContext({
  name: ContractName('sync-store'),
  contractType: 'store',
  instance: 'at-least-one',
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof syncStoreContract>;
export type ActionCreators = ContractActionCreators<typeof syncStoreContract>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
