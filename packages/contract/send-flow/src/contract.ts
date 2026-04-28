import { activitiesStoreContract } from '@lace-contract/activities';
import { addressAliasResolverAddonContract } from '@lace-contract/addresses';
import { analyticsStoreContract } from '@lace-contract/analytics';
import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import { tokensStoreContract } from '@lace-contract/tokens';
import { txExecutorStoreContract } from '@lace-contract/tx-executor';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

export const addressValidatorAddonContract = inferContractContext({
  name: ContractName('send-flow-address-validator-addon'),
  instance: 'at-least-one',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadAddressValidator'],
  },
});

export const baseTokenAddonContract = inferContractContext({
  name: ContractName('base-token-addon'),
  instance: 'at-least-one',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadBaseToken'],
  },
});

export const sendFlowAnalyticsEnhancerAddonContract = inferContractContext({
  name: ContractName('send-flow-analytics-enhancer-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadSendFlowAnalyticsEnhancers'],
  },
});

export const sendFlowStoreContract = inferContractContext({
  name: ContractName('send-flow-store'),
  instance: 'exactly-one',
  contractType: 'store',
  dependsOn: combineContracts([
    activitiesStoreContract,
    networkStoreContract,
    analyticsStoreContract,
    tokensStoreContract,
    txExecutorStoreContract,
    addressValidatorAddonContract,
    addressAliasResolverAddonContract,
    sendFlowAnalyticsEnhancerAddonContract,
    walletRepoStoreContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof sendFlowStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof sendFlowStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
