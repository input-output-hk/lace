import {
  MidnightNetworkId,
  MidnightSDKNetworkIds,
} from '@lace-contract/midnight-context';

import { MidnightNetworkNotConfiguredError } from './midnight-errors';

import type {
  MidnightContextSliceState,
  MidnightSDKNetworkId,
} from '@lace-contract/midnight-context';
import type { BlockchainNetworkId, NetworkType } from '@lace-contract/network';

/**
 * Structural requirement: the network store, which every loadout has, and
 * the Midnight context, which the engine loads.
 */
export type WalletWithMidnightNetwork = {
  dispatch: {
    (key: 'network.setNetworkType', networkType: NetworkType): void;
    (
      key: 'network.setBlockchainNetworks',
      networks: {
        blockchain: 'Midnight';
        mainnet: BlockchainNetworkId;
        testnet: BlockchainNetworkId;
      },
    ): void;
  };
  getState: () => {
    midnightContext?: Pick<MidnightContextSliceState, 'supportedNetworksIds'>;
  };
};

/**
 * Makes `networkId` the active Midnight network. A testnet also becomes the
 * selected testnet, so the wallet's testnet toggle returns to it. Throws
 * `MidnightNetworkNotConfiguredError` for a network the loadout has no
 * endpoints for: one outside `MIDNIGHT_PUBLIC_ENDPOINTS` whose `networks`
 * override lacks `nodeAddress` or `indexerAddress`.
 */
export const selectMidnightNetwork = (
  wallet: WalletWithMidnightNetwork,
  networkId: MidnightSDKNetworkId,
): void => {
  const supportedNetworkIds =
    wallet.getState().midnightContext?.supportedNetworksIds ?? [];
  if (!supportedNetworkIds.includes(networkId))
    throw new MidnightNetworkNotConfiguredError(networkId);

  if (networkId === MidnightSDKNetworkIds.MainNet) {
    wallet.dispatch('network.setNetworkType', 'mainnet');
    return;
  }
  wallet.dispatch('network.setBlockchainNetworks', {
    blockchain: 'Midnight',
    mainnet: MidnightNetworkId(MidnightSDKNetworkIds.MainNet),
    testnet: MidnightNetworkId(networkId),
  });
  wallet.dispatch('network.setNetworkType', 'testnet');
};
