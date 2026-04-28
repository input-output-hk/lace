import { PRICE_HISTORY_TTL, PRICE_TTL } from './const';
import { BitcoinTokenPriceId, CardanoTokenPriceId } from './value-objects';

import type {
  PriceDataPoint,
  TimeRange,
  TokenPrice,
  TokenPriceHistory,
} from './types';
import type { TokenPriceId } from './value-objects';
import type { Token } from '@lace-contract/tokens';
import type { BigNumber } from '@lace-sdk/util';

/**
 * Extract the identifier for a token across all blockchains.
 * Priority: ticker > name > tokenId
 */
export const getTokenIdentifier = (token: Token): string => {
  return token.metadata?.ticker || token.metadata?.name || token.tokenId;
};

/**
 * Determines whether a price needs to be fetched based on TTL.
 */
export const shouldFetchPrice = (
  priceData: TokenPrice | undefined,
): boolean => {
  if (!priceData) return true;

  const now = Date.now();
  return now - priceData.lastUpdated > PRICE_TTL;
};

/**
 * Determines whether price history needs to be fetched for a specific time range based on TTL.
 */
export const shouldFetchPriceHistory = (
  history: TokenPriceHistory | undefined,
  timeRange: TimeRange,
): boolean => {
  const hasData = history?.[timeRange] && history[timeRange].length > 0;
  if (!history?.lastFetched[timeRange] || !hasData) return true;

  const now = Date.now();
  const age = now - history.lastFetched[timeRange];
  return age > PRICE_HISTORY_TTL;
};

/**
 * Get the price ID for any supported token based on its blockchain.
 * Supports Cardano and Bitcoin tokens.
 */
export const getTokenPriceId = (token: Token): TokenPriceId | null => {
  const identifier = getTokenIdentifier(token);

  switch (token.blockchainName) {
    case 'Cardano':
      return CardanoTokenPriceId(identifier);
    case 'Bitcoin':
      return BitcoinTokenPriceId(identifier);
    case 'Midnight':
      // Midnight tokens are not priced
      return null;
    default:
      // Unsupported blockchain
      return null;
  }
};

/**
 * Maximum number of data points to compute for the portfolio chart.
 * More points are visually indistinguishable in the chart area (~300px wide).
 * Keeping this low avoids O(n*m) work that blocks the JS thread.
 */
const MAX_CHART_POINTS = 120;

/**
 * Evenly sample `maxPoints` indices from an array of length `totalLength`.
 * Always includes the first and last element.
 */
const sampleIndices = (totalLength: number, maxPoints: number): number[] => {
  if (totalLength <= maxPoints) {
    const indices: number[] = [];
    for (let index = 0; index < totalLength; index++) indices.push(index);
    return indices;
  }

  const indices: number[] = [0];
  const step = (totalLength - 1) / (maxPoints - 1);
  for (let index = 1; index < maxPoints - 1; index++) {
    indices.push(Math.round(index * step));
  }
  indices.push(totalLength - 1);
  return indices;
};

/**
 * Format a timestamp to "M/D" without using toLocaleDateString (slow on Hermes).
 */
const formatDateCheap = (timestamp: number): string => {
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

/**
 * Calculate portfolio value over time from individual token price histories.
 *
 * Performance notes:
 * - Timestamps are downsampled to MAX_CHART_POINTS before computation.
 * - Per-token price lookups use pre-built Map<timestamp, price> (O(1) per lookup).
 * - Date formatting uses cheap getMonth/getDate instead of toLocaleDateString.
 */
export const calculatePortfolioValueOverTime = (
  priceHistory: Map<TokenPriceId, PriceDataPoint[]>,
  tokens: Token[],
  currentPrices: Record<TokenPriceId, TokenPrice>,
): PriceDataPoint[] => {
  const tokenBalances = new Map<TokenPriceId, BigNumber>();
  const tokenDecimals = new Map<TokenPriceId, number>();

  for (const token of tokens) {
    const priceId = getTokenPriceId(token);
    if (!priceId) continue;

    tokenBalances.set(priceId, token.available);
    tokenDecimals.set(priceId, token.decimals);
  }

  if (tokenBalances.size === 0) {
    return [];
  }

  // Build per-token price index: Map<timestamp, price> for O(1) lookups
  const priceIndexByToken = new Map<TokenPriceId, Map<number, number>>();
  const timestampsSet = new Set<number>();

  for (const [priceId, history] of priceHistory.entries()) {
    const index = new Map<number, number>();
    for (const point of history) {
      index.set(point.timestamp, point.price);
      timestampsSet.add(point.timestamp);
    }
    priceIndexByToken.set(priceId, index);
  }

  const allTimestamps = Array.from(timestampsSet).sort((a, b) => a - b);

  // Downsample timestamps to avoid computing thousands of portfolio values
  const sampledIndices = sampleIndices(allTimestamps.length, MAX_CHART_POINTS);
  const timestamps = sampledIndices.map(index => allTimestamps[index]);

  // Track last known price for each token
  // Initialize with current prices as fallback
  const lastKnownPrices = new Map<TokenPriceId, number>();
  for (const [priceId, priceData] of Object.entries(currentPrices)) {
    if (priceData && priceData.price > 0) {
      lastKnownPrices.set(priceId as TokenPriceId, priceData.price);
    }
  }

  // For sampled timestamps, we need to carry forward prices from skipped timestamps.
  // Walk through ALL sorted timestamps but only emit portfolio values at sampled ones.
  const sampledSet = new Set(timestamps);
  const portfolioHistory: PriceDataPoint[] = [];

  for (const timestamp of allTimestamps) {
    // Update last known prices from this timestamp (O(1) per token)
    for (const [priceId] of priceIndexByToken) {
      const price = priceIndexByToken.get(priceId)!.get(timestamp);
      if (price !== undefined) {
        lastKnownPrices.set(priceId, price);
      }
    }

    // Only compute portfolio value at sampled timestamps
    if (!sampledSet.has(timestamp)) continue;

    let portfolioValue = 0;

    for (const [priceId, balance] of tokenBalances.entries()) {
      const price = lastKnownPrices.get(priceId);
      const decimals = tokenDecimals.get(priceId) ?? 0;

      if (price !== undefined && price > 0) {
        const balanceNumber = Number(balance) / Math.pow(10, decimals);
        portfolioValue += balanceNumber * price;
      }
    }

    portfolioHistory.push({
      timestamp,
      price: portfolioValue,
      date: formatDateCheap(timestamp),
    });
  }

  return portfolioHistory;
};
