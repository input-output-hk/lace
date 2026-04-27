import {
  authenticationPromptStoreContract,
  internalAuthSecretApiAddonContract,
} from '@lace-contract/authentication-prompt';
import { inMemoryIntegrationAddonContract } from '@lace-contract/in-memory';
import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import { hwWalletConnectorAddonContract } from '@lace-contract/onboarding-v2';
import { viewsStoreContract } from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

export const accountSettingsUIAddonContract = inferContractContext({
  name: ContractName('account-settings-ui-addon'),
  contractType: 'addon',
  instance: 'zero-or-more',
  provides: {
    addons: ['loadAccountSettingsUICustomisations'],
  },
});

export const accountCenterWalletsUIAddonContract = inferContractContext({
  name: ContractName('account-center-wallets-ui-addon'),
  contractType: 'addon',
  instance: 'zero-or-more',
  provides: {
    addons: ['loadAccountCenterWalletsUICustomisations'],
  },
});

export const accountManagementStoreContract = inferContractContext({
  name: ContractName('account-management-store'),
  contractType: 'store',
  instance: 'zero-or-more',
  dependsOn: combineContracts([
    walletRepoStoreContract,
    authenticationPromptStoreContract,
    internalAuthSecretApiAddonContract,
    inMemoryIntegrationAddonContract,
    hwWalletConnectorAddonContract,
    viewsStoreContract,
    networkStoreContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

// Contract for wallet settings UI customizations (component-based approach)
export const walletSettingsUICustomisationAddonContract = inferContractContext({
  name: ContractName('wallet-settings-ui-customisation-addon'),
  contractType: 'addon',
  instance: 'zero-or-more',
  provides: {
    addons: ['loadWalletSettingsUICustomisations'],
  },
});

export type Selectors = ContractSelectors<
  typeof accountManagementStoreContract
>;
export type ActionCreators = ContractActionCreators<
  typeof accountManagementStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
