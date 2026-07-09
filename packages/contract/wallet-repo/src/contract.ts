import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';

import store from './store';

export const walletRepoStoreContract = inferContractContext({
  contractType: 'store',
  name: ContractName('wallet-repo-store'),
  instance: 'exactly-one',
  dependsOn: combineContracts([networkStoreContract]),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export const vaultContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('vault'),
  instance: 'at-least-one',
});

export const requestHWConnectionAddonContract = inferContractContext({
  name: ContractName('request-hw-connection-addon'),
  instance: 'exactly-one',
  contractType: 'addon',
  provides: {
    addons: ['loadRequestHWConnections'],
  },
});

export const searchHWDevicesAddonContract = inferContractContext({
  name: ContractName('search-hw-devices-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadSearchHWDevices'],
  },
});

export const walletIdentityAddonContract = inferContractContext({
  name: ContractName('wallet-identity-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadWalletIdentity'],
  },
});
