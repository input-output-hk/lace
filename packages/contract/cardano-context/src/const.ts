import { Cardano } from '@cardano-sdk/core';
import { FeatureFlagKey } from '@lace-contract/feature';
import { TokenId } from '@lace-contract/tokens';

import { CardanoNetworkId } from './value-objects';

import type { BlockchainNetworkId } from '@lace-contract/network';

export const FEATURE_FLAG_CARDANO = FeatureFlagKey('BLOCKCHAIN_CARDANO');
export const LOVELACE_TOKEN_ID = TokenId('lovelace');
export const ADA_DECIMALS = 6;
export const COLLATERAL_AMOUNT_LOVELACES = 5_000_000; // 5 ADA in lovelace

export const supportedNetworkMagics = [
  Cardano.NetworkMagics.Mainnet,
  Cardano.NetworkMagics.Preprod,
  Cardano.NetworkMagics.Preview,
] as const;

export const supportedNetworkIds = new Map<
  BlockchainNetworkId,
  (typeof supportedNetworkMagics)[number]
>(supportedNetworkMagics.map(magic => [CardanoNetworkId(magic), magic]));
