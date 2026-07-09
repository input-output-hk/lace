import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
} from '@lace-contract/module';

export const onlineStatusStoreContract = inferContractContext({
  name: ContractName('online-status-store'),
  contractType: 'store',
  instance: 'exactly-one',
  dependsOn: combineContracts([] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof onlineStatusStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof onlineStatusStoreContract
>;
