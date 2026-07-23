import { supportedNetworkIds as bitcoinSupportedNetworkIds } from '@lace-contract/bitcoin-context';
import { supportedNetworkIds as cardanoSupportedNetworkIds } from '@lace-contract/cardano-context';

import type { BlockchainNetworkId } from '@lace-contract/network';

/**
 * All Lace-supported network ids of the blockchain being onboarded. Wallet
 * creation targets every supported network, and the ids must belong to the
 * requested blockchain so the Bitcoin connector is never fed Cardano network
 * ids (and vice versa).
 */
export const defaultTargetNetworks = (
  blockchainName: string,
): Set<BlockchainNetworkId> => {
  if (blockchainName === 'Cardano') {
    return new Set(cardanoSupportedNetworkIds.keys());
  }
  if (blockchainName === 'Bitcoin') {
    return new Set(bitcoinSupportedNetworkIds.keys());
  }
  throw new Error(`No supported networks for ${blockchainName} on Trezor`);
};
