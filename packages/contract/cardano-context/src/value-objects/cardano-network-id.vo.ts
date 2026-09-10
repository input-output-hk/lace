import { Cardano } from '@cardano-sdk/core';
import { BlockchainNetworkId } from '@lace-contract/network';

import type { Tagged } from 'type-fest';

export type CardanoNetworkId = Tagged<BlockchainNetworkId, 'CardanoNetworkId'>;

interface CardanoNetworkIdConstructor {
  (networkMagic: Cardano.NetworkMagic): CardanoNetworkId;

  getChainId(networkId: CardanoNetworkId): Cardano.ChainId;
  getChainId(networkId: BlockchainNetworkId): Cardano.ChainId | undefined;

  /**
   * The network's name — `Mainnet`, `Preprod`, `Preview` — for anything a person
   * reads. The id itself is a storage key: `cardano-1` names nothing to a user
   * checking which chain their transactions are on.
   *
   * Undefined for a network magic the SDK has no name for, so the caller decides
   * whether to fall back to the magic or say nothing.
   */
  getName(networkId: BlockchainNetworkId): string | undefined;
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
    getName: (networkId: BlockchainNetworkId): string | undefined => {
      const networkMagic = Number(networkId.split(CARDANO_NETWORK_PREFIX)[1]);
      // Reverse mapping on the SDK's numeric enum, so the names track the SDK
      // rather than a second list here that could drift from it.
      return Cardano.NetworkMagics[networkMagic] as string | undefined;
    },
  },
);
