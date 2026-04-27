import { featureStoreContract } from '@lace-contract/feature';
import { i18nDependencyContract } from '@lace-contract/i18n';
import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { secureStoreContract } from '@lace-contract/secure-store';
import { viewsStoreContract } from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type {
  ContractActionCreators,
  ContractSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

export const authSecretVerifierAddonContract = inferContractContext({
  contractType: 'addon',
  name: ContractName('auth-secret-verifier-addon'),
  instance: 'exactly-one',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadAuthSecretVerifier'],
  },
});

export const internalAuthSecretApiAddonContract = inferContractContext({
  contractType: 'addon',
  name: ContractName('internal-auth-secret-api-addon'),
  instance: 'exactly-one',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadAuthenticationPromptInternalAuthSecretApiExtension'],
  },
});

export const authPromptUIComponentAddonContract = inferContractContext({
  contractType: 'addon',
  name: ContractName('auth-prompt-ui-component-addon'),
  instance: 'zero-or-more',
  provides: {
    addons: ['loadRenderAuthPromptUI'],
  },
});

export const authenticationPromptDeferBiometricPromptAddon =
  inferContractContext({
    contractType: 'addon',
    name: ContractName('authentication-prompt-defer-biometric-addon'),
    instance: 'zero-or-more',
    provides: {
      addons: ['loadDeferBiometricPromptUntilActive'],
    },
  });

export const localAuthenticationDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('local-authentication-dependency'),
  instance: 'exactly-one',
});

export const authenticationPromptStoreContract = inferContractContext({
  contractType: 'store',
  name: ContractName('authentication-prompt-store'),
  instance: 'exactly-one',
  dependsOn: combineContracts([
    authSecretVerifierAddonContract,
    featureStoreContract,
    i18nDependencyContract,
    localAuthenticationDependencyContract,
    secureStoreContract,
    viewsStoreContract,
    walletRepoStoreContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<
  typeof authenticationPromptStoreContract
>;
export type ActionCreators = ContractActionCreators<
  typeof authenticationPromptStoreContract
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
