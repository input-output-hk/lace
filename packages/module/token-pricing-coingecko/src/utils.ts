import { DEFAULT_CURRENCY } from '@lace-contract/token-pricing';

import { COINGECKO_ENDPOINTS } from './const';

import type { CoinGeckoCoinEntry, CoinGeckoPriceData } from './types';
import type { TimeRange } from '@lace-lib/ui-toolkit';

/**
 * Normalises a fiat currency code to a lowercase ISO-style string.
 * Falls back to DEFAULT_CURRENCY for codes that would cause CoinGecko to
 * reject the request (empty, numeric, or otherwise malformed).
 */
export const normalizeCurrency = (currency: string): string =>
  /^[a-zA-Z]{2,6}$/.test(currency)
    ? currency.toLowerCase()
    : DEFAULT_CURRENCY.toLowerCase();

export const buildPriceUrl = (
  baseUrl: string,
  coinGeckoId: string,
  { currency, includeUsd = false }: { currency: string; includeUsd?: boolean },
): string => {
  const vsCurrency = normalizeCurrency(currency);
  const vsCurrencies =
    includeUsd && vsCurrency !== 'usd' ? `${vsCurrency},usd` : vsCurrency;

  return `${baseUrl}${COINGECKO_ENDPOINTS.SIMPLE_PRICE}?ids=${coinGeckoId}&vs_currencies=${vsCurrencies}&include_24hr_change=true`;
};

/**
 * Finds a CoinGecko ID for a token.
 *
 * When a `contractAddress` is provided (the token's unique on-chain asset id,
 * e.g. a Cardano `AssetId`), the coin is matched by comparing it against the
 * provider's per-asset platform value (`coin.platforms[blockchain]`). This is
 * the only correct match for native assets, because multiple unrelated coins
 * can share a ticker symbol. If no platform value matches, `undefined` is
 * returned — surfacing no price is preferable to a wrong price from a ticker
 * collision.
 *
 * When no `contractAddress` is provided (chain-native coins such as ADA/BTC),
 * the coin is matched by ticker symbol, then name.
 */
export const findCoinGeckoId = (
  {
    identifier,
    blockchain,
    contractAddress,
  }: { identifier: string; blockchain: string; contractAddress?: string },
  coinsList: CoinGeckoCoinEntry[],
): string | undefined => {
  const normalizedBlockchain = blockchain.toLowerCase();

  if (contractAddress) {
    const normalizedContractAddress = contractAddress.toLowerCase();
    const platformMatch = coinsList.find(
      coin =>
        coin.platforms[normalizedBlockchain]?.toLowerCase() ===
        normalizedContractAddress,
    );
    return platformMatch?.id;
  }

  const normalizedIdentifier = identifier.toLowerCase();

  // Find all coins matching by symbol
  const symbolMatches = coinsList.filter(
    coin => coin.symbol.toLowerCase() === normalizedIdentifier,
  );

  if (symbolMatches.length > 0) {
    return selectBestMatch(symbolMatches, normalizedBlockchain);
  }

  // If no symbol match, find all coins matching by name
  const nameMatches = coinsList.filter(
    coin => coin.name.toLowerCase() === normalizedIdentifier,
  );

  if (nameMatches.length > 0) {
    return selectBestMatch(nameMatches, normalizedBlockchain);
  }

  return undefined;
};

/**
 * Selects the best match from coin candidates based on blockchain.
 * Only returns a match if:
 * 1. The coin has the blockchain key in platforms (most specific), OR
 * 2. The coin has empty platforms (native token)
 *
 * Returns undefined if no relevant match is found to prevent wrong prices.
 */
const selectBestMatch = (
  matches: CoinGeckoCoinEntry[],
  blockchain: string,
): string | undefined => {
  if (matches.length === 0) {
    return undefined;
  }

  // Prefer coin with the blockchain key in platforms
  const blockchainMatch = matches.find(coin =>
    Object.hasOwn(coin.platforms, blockchain),
  );
  if (blockchainMatch) {
    return blockchainMatch.id;
  }

  // Prefer coin with empty platforms (native token)
  const nativeMatch = matches.find(
    coin => Object.keys(coin.platforms).length === 0,
  );
  if (nativeMatch) {
    return nativeMatch.id;
  }

  // No relevant match found - return undefined to prevent wrong prices
  return undefined;
};

/**
 * Extracts price and 24h change from a CoinGecko response object.
 * CoinGecko returns properties like { usd: 1.2, usd_24h_change: 0.5 }
 * Returns null if the price data is missing.
 */
export const extractPriceData = (
  priceInfo: Record<string, number>,
  currency = DEFAULT_CURRENCY,
): CoinGeckoPriceData | null => {
  const cgCurrency = normalizeCurrency(currency);

  if (!priceInfo[cgCurrency]) {
    return null;
  }

  return {
    price: priceInfo[cgCurrency],
    change24h: priceInfo[`${cgCurrency}_24h_change`],
    priceInUsd: priceInfo['usd'],
  };
};

/**
 * Converts a time range to Unix timestamp boundaries (in seconds).
 * @param timeRange - The time range period ('24H', '7D', '1M', or '1Y')
 * @returns An object with `from` (start timestamp) and `to` (current timestamp)
 */
export const getTimeRangeParams = (
  timeRange: TimeRange,
): { from: number; to: number } => {
  const now = Date.now();
  const to = Math.floor(now / 1000); // Unix timestamp in seconds

  let from: number;
  switch (timeRange) {
    case '24H':
      from = Math.floor((now - 24 * 60 * 60 * 1000) / 1000);
      break;
    case '7D':
      from = Math.floor((now - 7 * 24 * 60 * 60 * 1000) / 1000);
      break;
    case '1M':
      from = Math.floor((now - 30 * 24 * 60 * 60 * 1000) / 1000);
      break;
    case '1Y':
      from = Math.floor((now - 365 * 24 * 60 * 60 * 1000) / 1000);
      break;
  }

  return { from, to };
};
