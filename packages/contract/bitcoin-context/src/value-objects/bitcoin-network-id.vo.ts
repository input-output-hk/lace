import { BlockchainNetworkId } from '@lace-contract/network';

import { BitcoinNetwork } from '..';

import type { Tagged } from 'type-fest';

export type BitcoinNetworkId = BlockchainNetworkId &
  Tagged<string, 'BitcoinNetworkId'>;

const BITCOIN_NETWORK_PREFIX = 'bitcoin-';

interface BitcoinNetworkIdConstructor {
  (networkId: `${BitcoinNetwork}`): BitcoinNetworkId;

  getBitcoinNetwork(networkId: BitcoinNetworkId): BitcoinNetwork;
  getBitcoinNetwork(networkId: BlockchainNetworkId): BitcoinNetwork | undefined;
}

export const BitcoinNetworkId: BitcoinNetworkIdConstructor = Object.assign(
  (payload: `${BitcoinNetwork}`): BitcoinNetworkId =>
    BlockchainNetworkId(
      `${BITCOIN_NETWORK_PREFIX}${payload}`,
    ) as BitcoinNetworkId,
  {
    getBitcoinNetwork: ((
      networkId: BlockchainNetworkId,
    ): BitcoinNetwork | undefined => {
      const networkName = networkId.split(BITCOIN_NETWORK_PREFIX)[1];
      if (!networkName) return;
      return Object.values(BitcoinNetwork).find(
        network => network.valueOf() === networkName,
      );
    }) as BitcoinNetworkIdConstructor['getBitcoinNetwork'],
  },
);
