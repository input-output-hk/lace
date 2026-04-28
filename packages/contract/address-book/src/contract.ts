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

export const addressBookAddressValidatorAddonContract = inferContractContext({
  name: ContractName('address-book-address-validator-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadAddressBookAddressValidators'],
  },
});

export const addressBookStoreContract = inferContractContext({
  name: ContractName('address-book-store'),
  contractType: 'store',
  instance: 'exactly-one',
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof addressBookStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof addressBookStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
