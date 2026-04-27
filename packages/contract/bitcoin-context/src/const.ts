import { TokenId } from '@lace-contract/tokens';

import { BitcoinNetwork } from './types';
import { BitcoinNetworkId } from './value-objects';

import type { FeatureFlagKey } from '@lace-contract/feature';
import type { BlockchainNetworkId } from '@lace-contract/network';

export const BITCOIN_FEATURE_FLAG = 'BLOCKCHAIN_BITCOIN' as FeatureFlagKey;
export const BITCOIN_MEMPOOL_FEE_MARKET_FEATURE_FLAG =
  'BITCOIN_MEMPOOL_FEE_MARKET' as FeatureFlagKey;

export const BITCOIN_TOKEN_ID = TokenId('bitcoin');

export const allSupportedNetworks = [
  BitcoinNetwork.Mainnet,
  BitcoinNetwork.Testnet,
] as const;

export const supportedNetworkIds = new Map<BlockchainNetworkId, BitcoinNetwork>(
  allSupportedNetworks.map(network => [BitcoinNetworkId(network), network]),
);
