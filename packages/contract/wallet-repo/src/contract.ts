import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';

import store from './store';

/**
 * Store contract for the wallet repository: the persisted `wallets` state
 * holding every wallet, its accounts and the active account. Exactly one
 * module provides it; it depends on the network store.
 */
export const walletRepoStoreContract = inferContractContext({
  contractType: 'store',
  name: ContractName('wallet-repo-store'),
  instance: 'exactly-one',
  dependsOn: combineContracts([networkStoreContract]),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

/**
 * Addon contract for the `loadRequestHWConnections` addon, which prompts the
 * user to connect a hardware wallet device and resolves with its device
 * descriptor. Exactly one module provides it.
 */
export const requestHWConnectionAddonContract = inferContractContext({
  name: ContractName('request-hw-connection-addon'),
  instance: 'exactly-one',
  contractType: 'addon',
  provides: {
    addons: ['loadRequestHWConnections'],
  },
});

/**
 * Addon contract for the `loadSearchHWDevices` addon, which scans for
 * connectable hardware wallet devices and reports them as they are found.
 * Any number of modules may provide it, typically one per device vendor.
 */
export const searchHWDevicesAddonContract = inferContractContext({
  name: ContractName('search-hw-devices-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  provides: {
    addons: ['loadSearchHWDevices'],
  },
});

/**
 * Addon contract for the `loadWalletIdentity` addon, through which each
 * blockchain module supplies its {@link WalletIdentity} extractor. Any number
 * of modules may provide it, and it is preloaded in the service worker.
 */
export const walletIdentityAddonContract = inferContractContext({
  name: ContractName('wallet-identity-addon'),
  instance: 'zero-or-more',
  contractType: 'addon',
  preloadInServiceWorker: true,
  provides: {
    addons: ['loadWalletIdentity'],
  },
});
