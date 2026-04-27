import { Cardano } from '@cardano-sdk/core';
import { BlockchainNetworkId } from '@lace-contract/network';

import type { Tagged } from 'type-fest';

export type CardanoNetworkId = Tagged<BlockchainNetworkId, 'CardanoNetworkId'>;

interface CardanoNetworkIdConstructor {
  (networkMagic: Cardano.NetworkMagic): CardanoNetworkId;

  getChainId(networkId: CardanoNetworkId): Cardano.ChainId;
  getChainId(networkId: BlockchainNetworkId): Cardano.ChainId | undefined;
}

const CARDANO_NETWORK_PREFIX = 'cardano-';

export const CardanoNetworkId: CardanoNetworkIdConstructor = Object.assign(
  (networkMagic: Cardano.NetworkMagic): CardanoNetworkId =>
    BlockchainNetworkId(
      `${CARDANO_NETWORK_PREFIX}${networkMagic}`,
    ) as CardanoNetworkId,
  {
    getChainId: ((
      networkId: BlockchainNetworkId,
    ): Cardano.ChainId | undefined => {
      const networkMagic = Number(networkId.split(CARDANO_NETWORK_PREFIX)[1]);
      if (!networkMagic) return;
      const chainId = Object.values(Cardano.ChainIds).find(
        chainId => chainId.networkMagic.valueOf() === networkMagic,
      );
      return chainId;
    }) as CardanoNetworkIdConstructor['getChainId'],
  },
);
