import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { viewsStoreContract } from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

export const recoveryPhraseChannelExtensionContract = inferContractContext({
  name: ContractName('recovery-phrase-channel-extension'),
  contractType: 'addon',
  instance: 'zero-or-more',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadRecoveryPhraseChannelExtension'],
  },
});

export const recoveryPhraseStoreContract = inferContractContext({
  name: ContractName('recovery-phrase-store'),
  instance: 'exactly-one',
  contractType: 'store',
  dependsOn: combineContracts([
    authenticationPromptStoreContract,
    recoveryPhraseChannelExtensionContract,
    walletRepoStoreContract,
    viewsStoreContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof recoveryPhraseStoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof recoveryPhraseStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
