import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
import { featureStoreContract } from '@lace-contract/feature';
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

export const appLockSetupAddon = inferContractContext({
  name: ContractName('app-lock-setup-addon'),
  contractType: 'addon',
  instance: 'exactly-one',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadSetupAppLock'],
  },
});

export const appLockActivityChannelAddon = inferContractContext({
  name: ContractName('app-lock-activity-channel-addon'),
  contractType: 'addon',
  instance: 'zero-or-more',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadActivityChannelExtension'],
  },
});

export const appLockStoreContract = inferContractContext({
  name: ContractName('app-lock-store'),
  contractType: 'store',
  instance: 'exactly-one',
  dependsOn: combineContracts([
    authenticationPromptStoreContract,
    featureStoreContract,
    walletRepoStoreContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof appLockStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof appLockStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
