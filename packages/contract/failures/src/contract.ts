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

export const failuresStoreContract = inferContractContext({
  name: ContractName('failures-store'),
  contractType: 'store',
  instance: 'exactly-one',
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof failuresStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof failuresStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
