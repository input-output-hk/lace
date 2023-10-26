/* eslint-disable unicorn/no-null */
import { AddressDiscovery, DEFAULT_LOOK_AHEAD_SEARCH, HDSequentialDiscovery } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';
import {
  AddressesDiscoverer,
  AddressesDiscovererDependencies,
  consumeKeyAgent,
  exposeAddressesDiscoverer
} from '@lib/communication';
import { getProviders } from '@lib/scripts/background/config';
import { Subject } from 'rxjs';

let currentChain: Wallet.ChainName;
let addressesDiscovererInstance: AddressDiscovery;
let asyncKeyAgent: Wallet.KeyManagement.AsyncKeyAgent;

const addresses$ = new Subject<Wallet.KeyManagement.GroupedAddress[] | null>();

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getAddressesDiscovererInstance = ({ chainName }: AddressesDiscovererDependencies) => {
  if (addressesDiscovererInstance && currentChain === chainName) return addressesDiscovererInstance;

  const { chainHistoryProvider } = getProviders(chainName);
  const hdSequentialDiscovery = new HDSequentialDiscovery(chainHistoryProvider, DEFAULT_LOOK_AHEAD_SEARCH);

  addressesDiscovererInstance = {
    discover: async (passedAsyncKeyAgent) => {
      const subscription = passedAsyncKeyAgent.knownAddresses$.subscribe((addresses) => addresses$.next(addresses));
      try {
        throw new Error('Test');
        return await hdSequentialDiscovery.discover(passedAsyncKeyAgent);
      } catch (error) {
        addresses$.error(error);
        throw error;
      } finally {
        subscription.unsubscribe();
      }
    }
  };

  return addressesDiscovererInstance;
};

const addressesDiscoverer: AddressesDiscoverer = {
  addresses$,
  discover: async ({ chainName }) => getAddressesDiscovererInstance({ chainName }).discover(asyncKeyAgent),
  setup: (walletId) => {
    asyncKeyAgent = consumeKeyAgent(walletId);
    const subscription = asyncKeyAgent.knownAddresses$.subscribe((addresses) => {
      addresses$.next(addresses);
      subscription.unsubscribe();
    });
  }
};

exposeAddressesDiscoverer(addressesDiscoverer);
