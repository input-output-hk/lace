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

export const notificationCenterStoreContract = inferContractContext({
  name: ContractName('notification-center-store'),
  contractType: 'store',
  instance: 'zero-or-more',
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<
  typeof notificationCenterStoreContract
>;
export type ActionCreators = ContractActionCreators<
  typeof notificationCenterStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
