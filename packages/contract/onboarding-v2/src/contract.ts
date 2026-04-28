import { appLockSetupAddon } from '@lace-contract/app-lock';
import {
  authenticationPromptStoreContract,
  internalAuthSecretApiAddonContract,
  localAuthenticationDependencyContract,
} from '@lace-contract/authentication-prompt/src/contract';
import { inMemoryIntegrationAddonContract } from '@lace-contract/in-memory';
import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { syncStoreContract } from '@lace-contract/sync';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

export const onboardingOptionsAddonContract = inferContractContext({
  name: ContractName('onboarding-options-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadOnboardingOptions'],
  },
});

export const onboardingStartWalletDropdownAddonContract = inferContractContext({
  name: ContractName('onboarding-start-wallet-dropdown-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadOnboardingStartWalletDropdownUICustomisations'],
  },
});

export const hwWalletConnectorAddonContract = inferContractContext({
  name: ContractName('hw-wallet-connector-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadHwWalletConnector'],
  },
});

export const hwBlockchainSupportAddonContract = inferContractContext({
  name: ContractName('hw-blockchain-support-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadHwBlockchainSupport'],
  },
});

export const ledgerHwAccountConnectorAddonContract = inferContractContext({
  name: ContractName('ledger-hw-account-connector-addon'),
  instance: 'at-least-one',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadLedgerHwAccountConnector'],
  },
});

export const trezorHwAccountConnectorAddonContract = inferContractContext({
  name: ContractName('trezor-hw-account-connector-addon'),
  instance: 'at-least-one',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadTrezorHwAccountConnector'],
  },
});

export const onboardingConfigAddonContract = inferContractContext({
  name: ContractName('onboarding-config-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadOnboardingConfig'],
  },
});

export const onboardingV2StoreContract = inferContractContext({
  name: ContractName('onboarding-v2-store'),
  contractType: 'store',
  // TODO: make sure that this is correct and exactly 1 module that implements
  // this contract should be loaded
  instance: 'exactly-one',
  dependsOn: combineContracts([
    appLockSetupAddon,
    walletRepoStoreContract,
    inMemoryIntegrationAddonContract,
    authenticationPromptStoreContract,
    internalAuthSecretApiAddonContract,
    localAuthenticationDependencyContract,
    syncStoreContract,
    hwWalletConnectorAddonContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof onboardingV2StoreContract>;
export type ActionCreators = ContractActionCreators<
  typeof onboardingV2StoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
