/* eslint-disable unicorn/no-null */
import { AddressDiscovery, DEFAULT_LOOK_AHEAD_SEARCH, HDSequentialDiscovery } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';
import {
  AddressesDiscoverer,
  AddressesDiscoveryStatus,
  consumeKeyAgent,
  exposeAddressesDiscoverer
} from '@lib/communication';
import { getProviders } from '@lib/scripts/background/config';
import { Subject } from 'rxjs';

let discovererInstance: AddressDiscovery;
let chainNameOfDiscovererInstance: Wallet.ChainName;
let currentChainName: Wallet.ChainName;
let currentAsyncKeyAgent: Wallet.KeyManagement.AsyncKeyAgent;
const status$ = new Subject<AddressesDiscoveryStatus>();
status$.next(AddressesDiscoveryStatus.Idle);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getDiscovererInstance = ({ chainName }: { chainName: Wallet.ChainName }) => {
  if (discovererInstance && chainNameOfDiscovererInstance === chainName) return discovererInstance;

  const { chainHistoryProvider } = getProviders(chainName);
  const hdSequentialDiscovery = new HDSequentialDiscovery(chainHistoryProvider, DEFAULT_LOOK_AHEAD_SEARCH);

  discovererInstance = {
    discover: async (asyncKeyAgent) => {
      status$.next(AddressesDiscoveryStatus.InProgress);
      try {
        const addresses = await hdSequentialDiscovery.discover(asyncKeyAgent);
        status$.next(AddressesDiscoveryStatus.Idle);
        return addresses;
      } catch (error) {
        status$.next(AddressesDiscoveryStatus.Error);
        throw error;
      }
    }
  };

  return discovererInstance;
};

const addressesDiscoverer: AddressesDiscoverer = {
  status$,
  discover: async () => {
    const bip32Account = await Wallet.KeyManagement.Bip32Account.fromAsyncKeyAgent(currentAsyncKeyAgent);
    return getDiscovererInstance({ chainName: currentChainName }).discover(bip32Account);
  },
  setup: ({ chainName, keyAgentChannelName }) => {
    currentChainName = chainName;
    currentAsyncKeyAgent = consumeKeyAgent(keyAgentChannelName);
  }
};

exposeAddressesDiscoverer(addressesDiscoverer);
