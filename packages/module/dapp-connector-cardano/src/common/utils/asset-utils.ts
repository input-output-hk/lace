import type { Cardano } from '@cardano-sdk/core';
import type { TokenId, StoredTokenMetadata } from '@lace-contract/tokens';

/**
 * Display information for an asset including name, ticker, image, decimals, and NFT status.
 */
export interface AssetDisplayInfo {
  /** Full display name for the asset */
  name: string;
  /** Short ticker symbol for the asset */
  ticker: string;
  /** Image URL for the asset icon, if available */
  image?: string;
  /** Number of decimal places for formatting amounts */
  decimals: number;
  /** Whether this asset is an NFT (non-fungible token) */
  isNft: boolean;
}

/**
 * Default icon size in pixels for fallback icon generation.
 */
const DEFAULT_ICON_SIZE = 24;

/**
 * Constructs a TokenId from a Cardano asset ID.
 *
 * Cardano asset IDs follow the format: policyId (56 hex chars) + assetName (variable hex chars).
 * This function converts that format to the TokenId format used in the tokens store.
 *
 * @param assetId - The Cardano asset ID (policyId concatenated with assetName in hex)
 * @returns TokenId in the format "policyId.assetNameHex"
 */
export const constructTokenId = (assetId: Cardano.AssetId): TokenId => {
  const policyId = assetId.slice(0, 56);
  const assetNameHex = assetId.slice(56);
  return `${policyId}.${assetNameHex}` as TokenId;
};

/**
 * Extracts the policy ID from a Cardano asset ID.
 *
 * @param assetId - The Cardano asset ID
 * @returns The 56-character policy ID hex string
 */
export const extractPolicyId = (assetId: Cardano.AssetId): string => {
  return assetId.slice(0, 56);
};

/**
 * Extracts the asset name hex from a Cardano asset ID.
 *
 * @param assetId - The Cardano asset ID
 * @returns The asset name in hex format (variable length)
 */
export const extractAssetNameHex = (assetId: Cardano.AssetId): string => {
  return assetId.slice(56);
};

/**
 * Decodes an asset name from hex to UTF-8 if possible.
 *
 * @param hexName - The asset name in hex format
 * @returns Decoded UTF-8 string if printable, otherwise truncated hex
 */
export const decodeAssetName = (hexName: string): string => {
  if (!hexName) return 'Unknown';
  try {
    const bytes = new Uint8Array(
      hexName.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) ?? [],
    );
    const decoded = new TextDecoder('utf-8').decode(bytes);
    if (/^[\x20-\x7E]+$/.test(decoded)) {
      return decoded;
    }
    return truncateHex(hexName);
  } catch {
    return truncateHex(hexName);
  }
};

/**
 * Truncates a hex string for display.
 *
 * @param hex - The hex string to truncate
 * @param startChars - Number of characters to show at the start
 * @param endChars - Number of characters to show at the end
 * @returns Truncated string with ellipsis
 */
const truncateHex = (hex: string, startChars = 6, endChars = 6): string => {
  if (hex.length <= startChars + endChars + 3) return hex;
  return `${hex.slice(0, startChars)}...${hex.slice(-endChars)}`;
};

/**
 * Gets display information for an asset, using metadata if available.
 *
 * This function looks up metadata for the given asset ID and returns formatted
 * display information. If no metadata is found, it falls back to decoding
 * the asset name from hex and using default values.
 *
 * @param assetId - The Cardano asset ID
 * @param metadata - Optional token metadata from the store
 * @returns AssetDisplayInfo with name, ticker, image, decimals, and NFT status
 */
export const getAssetDisplayInfo = (
  assetId: Cardano.AssetId,
  metadata?: StoredTokenMetadata,
): AssetDisplayInfo => {
  const assetNameHex = extractAssetNameHex(assetId);
  const decodedName = decodeAssetName(assetNameHex);

  if (metadata) {
    return {
      name: metadata.name || decodedName,
      ticker:
        metadata.ticker || getTickerFallback(metadata.name || decodedName),
      image: metadata.image,
      decimals: metadata.decimals ?? 0,
      isNft: metadata.isNft ?? false,
    };
  }

  return {
    name: decodedName,
    ticker: getTickerFallback(decodedName),
    image: undefined,
    decimals: 0,
    isNft: false,
  };
};

/**
 * Generates a fallback ticker from a token name.
 *
 * Takes the first 2 characters and last 2 characters separated by ellipsis.
 *
 * @param name - The token name to generate a ticker from
 * @returns A fallback ticker in format "AB...CD"
 */
export const getTickerFallback = (name: string): string => {
  if (name.length <= 7) return name;
  return `${name.slice(0, 2)}...${name.slice(-2)}`;
};

/**
 * Formats an asset amount using the specified number of decimal places.
 *
 * @param amount - The raw amount as a bigint
 * @param decimals - The number of decimal places to use
 * @returns Formatted string representation of the amount
 */
export const formatAssetAmount = (amount: bigint, decimals: number): string => {
  if (decimals === 0) {
    return amount.toString();
  }

  const divisor = BigInt(10 ** decimals);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;

  if (fractionalPart === BigInt(0)) {
    return wholePart.toString();
  }

  const fractionalString = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalString.replace(/0+$/, '');

  return `${wholePart}.${trimmedFractional}`;
};

/**
 * Generates a data URL for a fallback icon using jdenticon-style identicon.
 *
 * This creates a simple SVG with the first two characters of the ticker
 * displayed in a colored circle.
 *
 * @param ticker - The ticker or name to generate an icon for
 * @param size - The size of the icon in pixels
 * @returns A data URL containing an SVG fallback icon
 */
export const generateFallbackIconUrl = (
  ticker: string,
  size = DEFAULT_ICON_SIZE,
): string => {
  const initials = ticker.slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#6B7280"/>
    <text x="${size / 2}" y="${
    size / 2
  }" dy="0.35em" text-anchor="middle" fill="white" font-size="${
    size * 0.4
  }" font-weight="600" font-family="sans-serif">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/**
 * Determines if an asset should be treated as an NFT.
 *
 * An asset is considered an NFT if the metadata explicitly marks it as such
 * via the isNft flag.
 *
 * @param metadata - Optional token metadata from the store
 * @returns True if the asset is an NFT, false otherwise
 */
export const isAssetNft = (metadata?: StoredTokenMetadata): boolean => {
  return metadata?.isNft ?? false;
};

/**
 * Type alias for the metadata map structure from the tokens store.
 */
export type TokensMetadataMap = Partial<Record<TokenId, StoredTokenMetadata>>;
