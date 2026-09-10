import {
  ContractName,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';

import store from './store';

export const vaultContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('vault'),
  instance: 'at-least-one',
});

/**
 * Wallet-mutating ceremony launch. Its only state is the single-slot
 * launch-pending flag; exactly one module implements it: the in-app arm
 * navigates in process, the shell-host arm proxies to `window.lace`.
 */
export const vaultCeremonyStoreContract = inferContractContext({
  contractType: 'store',
  name: ContractName('vault-ceremony-store'),
  instance: 'exactly-one',
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

/** Feature detection for the ceremonies the active vault arm can launch. */
export const vaultCapabilitiesAddonContract = inferContractContext({
  name: ContractName('vault-capabilities-addon'),
  instance: 'exactly-one',
  contractType: 'addon',
  provides: {
    addons: ['loadVaultCapabilities'],
  },
});
