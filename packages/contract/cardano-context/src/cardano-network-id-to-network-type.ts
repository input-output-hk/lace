import { Cardano } from '@cardano-sdk/core';

import type { CardanoNetworkId } from './value-objects/cardano-network-id.vo';
import type { NetworkType } from '@lace-contract/network';

const CARDANO_NETWORK_PREFIX = 'cardano-';

/**
 * Maps Cardano Ouroboros network magic to Lace `network.selectNetworkType` (`mainnet` | `testnet`).
 * Only mainnet magic is distinct; every other magic (preprod, preview, custom, etc.) maps to `testnet`.
 */
export const cardanoNetworkMagicToNetworkType = (
  networkMagic: Cardano.NetworkMagic,
): NetworkType =>
  networkMagic === Number(Cardano.NetworkMagics.Mainnet)
    ? 'mainnet'
    : 'testnet';

/**
 * Maps a Lace Cardano blockchain network id (`cardano-<networkMagic>`) to mainnet vs testnet for display.
 */
export const cardanoNetworkIdToNetworkType = (
  networkId: CardanoNetworkId,
): NetworkType =>
  cardanoNetworkMagicToNetworkType(
    Number((networkId as string).slice(CARDANO_NETWORK_PREFIX.length)),
  );
