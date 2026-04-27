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

import './types';

export const activitiesListCustomizationsAddonContract = inferContractContext({
  name: ContractName('activities-list-customizations-addon'),
  contractType: 'addon',
  instance: 'zero-or-more',
  provides: {
    addons: [
      'loadActivitiesListUICustomisations',
      'loadActivitiesOfTokenUICustomisations',
    ],
  },
});

export const activitiesItemCustomizationsAddonContract = inferContractContext({
  name: ContractName('activities-item-customizations-addon'),
  contractType: 'addon',
  instance: 'zero-or-more',
  provides: {
    addons: ['loadActivitiesItemUICustomisations'],
  },
});

export const activitiesDetailsSheetCustomizationsAddonContract =
  inferContractContext({
    name: ContractName('activities-details-sheet-customizations-addon'),
    contractType: 'addon',
    instance: 'zero-or-more',
    provides: {
      addons: ['loadActivityDetailsSheetUICustomisations'],
    },
  });

export const activitiesStoreContract = inferContractContext({
  name: ContractName('activities-store'),
  contractType: 'store',
  instance: 'exactly-one',
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof activitiesStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof activitiesStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
