import { constructTokenId, type TokensMetadataMap } from './asset-utils';

import type { TokenTransferValue } from '../hooks';
import type { Cardano } from '@cardano-sdk/core';
import type { StoredTokenMetadata } from '@lace-contract/tokens';

/**
 * Represents an asset with its amount and associated metadata.
 * Used for displaying assets in the transaction UI.
 */
export interface AssetWithMetadata {
  /** The unique Cardano asset ID (policy ID + asset name hex) */
  assetId: Cardano.AssetId;
  /** The amount of this asset being transferred */
  amount: bigint;
  /** Optional metadata for display (name, ticker, image, decimals, NFT status) */
  metadata?: StoredTokenMetadata;
}

/**
 * Assets grouped by type for a single address.
 * Separates NFTs from fungible tokens for proper display.
 */
export interface GroupedAddressAssets {
  /** Non-fungible tokens (isNft flag set or supply === 1) */
  nfts: AssetWithMetadata[];
  /** Fungible tokens */
  tokens: AssetWithMetadata[];
  /** ADA/coin amounts (typically one, but supports multiple for edge cases) */
  coins: bigint[];
}

/**
 * Determines if an asset should be classified as an NFT.
 *
 * An asset is considered an NFT if its metadata explicitly marks it as such.
 * This aligns with how Lace V1 determines NFT status.
 *
 * @param metadata - Optional token metadata from the store
 * @returns True if the asset is an NFT, false otherwise
 */
export const isNftAsset = (metadata?: StoredTokenMetadata): boolean => {
  return metadata?.isNft ?? false;
};

/**
 * Groups addresses by their asset types (coins, tokens, NFTs).
 *
 * This function transforms a map of addresses with their token transfer values
 * into a map of addresses with grouped assets. Each address's assets are separated
 * into coins (ADA), fungible tokens, and NFTs.
 *
 * Addresses with no value (zero coins and no assets) are filtered out.
 *
 * @param addresses - Map of payment addresses to their token transfer values
 * @param tokensMetadata - Optional metadata map for looking up asset display info
 * @returns Map of addresses to their grouped assets
 */
export const groupAddressesByAssetType = (
  addresses: Map<Cardano.PaymentAddress, TokenTransferValue>,
  tokensMetadata?: TokensMetadataMap,
): Map<Cardano.PaymentAddress, GroupedAddressAssets> => {
  const groupedAddresses = new Map<
    Cardano.PaymentAddress,
    GroupedAddressAssets
  >();

  for (const [address, value] of addresses) {
    const group: GroupedAddressAssets = {
      coins: [],
      nfts: [],
      tokens: [],
    };

    if (value.coins !== BigInt(0)) {
      group.coins.push(value.coins);
    }

    for (const [assetId, amount] of value.assets) {
      const tokenId = constructTokenId(assetId);
      const metadata = tokensMetadata?.[tokenId];

      const assetWithMetadata: AssetWithMetadata = {
        assetId,
        amount,
        metadata,
      };

      if (isNftAsset(metadata)) {
        group.nfts.push(assetWithMetadata);
      } else {
        group.tokens.push(assetWithMetadata);
      }
    }

    if (
      group.coins.length > 0 ||
      group.nfts.length > 0 ||
      group.tokens.length > 0
    ) {
      groupedAddresses.set(address, group);
    }
  }

  return groupedAddresses;
};

/**
 * Calculates the total number of token items (excluding NFTs) for an address.
 * Includes coins as 1 item if present.
 *
 * @param group - The grouped assets for an address
 * @returns The count of tokens plus 1 if coins are present
 */
export const getTokenItemCount = (group: GroupedAddressAssets): number => {
  let count = group.tokens.length;
  if (group.coins.length > 0) {
    count += 1;
  }
  return count;
};

/**
 * Calculates the total number of NFT items for an address.
 *
 * @param group - The grouped assets for an address
 * @returns The count of NFTs
 */
export const getNftItemCount = (group: GroupedAddressAssets): number => {
  return group.nfts.length;
};
