import {
  networkSelectors,
  type BlockchainNetworkId,
  type NetworkType,
} from '@lace-contract/network';

import { cardanoNetworkMagicToNetworkType } from './cardano-network-id-to-network-type';
import { supportedNetworkIds } from './const';
import { cardanoContextSelectors } from './store';
import { CardanoNetworkId } from './value-objects/cardano-network-id.vo';

import type { Cardano } from '@cardano-sdk/core';
import type { State } from '@lace-contract/module';

/**
 * Resolves Cardano chain and Lace network classification for hardware onboarding.
 * When {@link targetNetwork} is set, it must be a Lace-supported Cardano network id.
 * Otherwise the active chain and network type are read from Redux state.
 */
export const getNetworkDetails = (
  state: State,
  targetNetwork?: BlockchainNetworkId,
): {
  chainId: Cardano.ChainId;
  networkId: CardanoNetworkId;
  networkType: NetworkType;
} => {
  if (targetNetwork !== undefined) {
    if (!supportedNetworkIds.has(targetNetwork))
      throw new Error('Target network is not a supported Cardano network');

    const chainId = CardanoNetworkId.getChainId(targetNetwork);

    if (!chainId) throw new Error('Invalid Cardano chain for target network');

    const networkId = CardanoNetworkId(chainId.networkMagic);
    const networkType = cardanoNetworkMagicToNetworkType(chainId.networkMagic);

    return { chainId, networkId, networkType };
  }

  const chainId = cardanoContextSelectors.cardanoContext.selectChainId(state);
  const networkType = networkSelectors.network.selectNetworkType(state);

  if (!networkType || !chainId)
    throw new Error('Network type or Cardano chain ID is not set');

  const networkId = CardanoNetworkId(chainId.networkMagic);

  return { chainId, networkId, networkType };
};
