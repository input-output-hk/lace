import { DEFAULT_CURRENCY } from '@lace-contract/token-pricing';

import { COINGECKO_ENDPOINTS, CURRENCY_MAP } from './const';

import type { CoinGeckoCoinEntry, CoinGeckoPriceData } from './types';
import type { TimeRange } from '@lace-lib/ui-toolkit';

export type SupportedCurrency = keyof typeof CURRENCY_MAP;

const isSupportedCurrency = (
  currency: string,
): currency is SupportedCurrency => {
  return Object.keys(CURRENCY_MAP).includes(currency);
};

export const getSupportedCurrency = (currency: string): SupportedCurrency => {
  const upperCurrency = currency.toUpperCase();
  return isSupportedCurrency(upperCurrency) ? upperCurrency : DEFAULT_CURRENCY;
};

export const buildPriceUrl = (
  baseUrl: string,
  coinGeckoId: string,
  currency: string,
): string => {
  const supportedCurrency = getSupportedCurrency(currency);
  const vsCurrency = CURRENCY_MAP[supportedCurrency];

  return `${baseUrl}${COINGECKO_ENDPOINTS.SIMPLE_PRICE}?ids=${coinGeckoId}&vs_currencies=${vsCurrency}&include_24hr_change=true`;
};

/**
 * Finds a CoinGecko ID by matching the identifier against symbol or name.
 */
export const findCoinGeckoId = (
  identifier: string,
  blockchain: string,
  coinsList: CoinGeckoCoinEntry[],
): string | undefined => {
  const normalizedIdentifier = identifier.toLowerCase();
  const normalizedBlockchain = blockchain.toLowerCase();

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
    Object.prototype.hasOwnProperty.call(coin.platforms, blockchain),
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
  const supportedCurrency = getSupportedCurrency(currency);
  const cgCurrency = CURRENCY_MAP[supportedCurrency];

  if (!priceInfo[cgCurrency]) {
    return null;
  }

  return {
    price: priceInfo[cgCurrency],
    change24h: priceInfo[`${cgCurrency}_24h_change`],
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
