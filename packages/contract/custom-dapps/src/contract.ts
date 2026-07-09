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

export const customDappsStoreContract = inferContractContext({
  name: ContractName('custom-dapps-store'),
  contractType: 'store',
  instance: 'exactly-one',
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof customDappsStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof customDappsStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
