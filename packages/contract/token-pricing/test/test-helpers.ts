import { TokenId } from '@lace-contract/tokens';
import { vi } from 'vitest';

import { CardanoTokenPriceId } from '../src/value-objects';

import type { PriceDataPoint, TimeRange } from '../src';
import type { TokenPricingProvider } from '../src/dependencies';
import type {
  TokenPriceHistoryResponse,
  TokenPriceResponse,
} from '../src/types';
import type { Address } from '@lace-contract/addresses';
import type { Token } from '@lace-contract/tokens';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { BigNumber } from '@lace-sdk/util';
import type { Observable } from 'rxjs';

export const createMockToken = (tokenId: string): Token => ({
  tokenId: TokenId(tokenId),
  blockchainName: 'Cardano',
  accountId: 'account-1' as AccountId,
  address: 'addr1' as Address,
  available: '1000000' as unknown as BigNumber,
  pending: '0' as unknown as BigNumber,
  displayLongName: tokenId.toUpperCase(),
  displayShortName: tokenId.toUpperCase(),
  decimals: 6,
});

export const createMockResponse = (
  tokenId: string,
  price: number,
): TokenPriceResponse => ({
  priceId: CardanoTokenPriceId(TokenId(tokenId)),
  blockchain: 'Cardano',
  identifier: tokenId,
  price,
  fiatCurrency: 'USD',
  change24h: 2.5,
});

/**
 * Creates mock price history data points
 */
export const createMockPriceHistory = (
  count: number = 24,
  basePrice: number = 1.0,
): PriceDataPoint[] => {
  const now = Date.now();
  return Array.from({ length: count }, (_, index) => ({
    timestamp: now - (count - index - 1) * 3600000, // Hourly data points
    price: basePrice + Math.random() * 0.1 - 0.05,
    date: new Date(now - (count - index - 1) * 3600000).toISOString(),
  }));
};

/**
 * Creates a mock TokenPriceHistoryResponse
 */
export const createMockPriceHistoryResponse = (
  tokenId: string,
  timeRange: TimeRange,
  priceHistory?: PriceDataPoint[],
): TokenPriceHistoryResponse => ({
  priceId: CardanoTokenPriceId(TokenId(tokenId)),
  timeRange,
  data: priceHistory || createMockPriceHistory(),
});

/**
 * Creates a mock TokenPricingProvider with configurable behavior
 * @param fetchPricesReturn Optional observable to return from fetchPrices
 * @param fetchPriceHistoryReturn Optional observable to return from fetchPriceHistory
 * @returns A mock TokenPricingProvider instance
 */
export const createMockProvider = (
  fetchPricesReturn?: Observable<TokenPriceResponse[]>,
  fetchPriceHistoryReturn?: Observable<TokenPriceHistoryResponse[]>,
): TokenPricingProvider => ({
  fetchPrices: fetchPricesReturn
    ? vi.fn().mockReturnValue(fetchPricesReturn)
    : vi.fn(),
  fetchPriceHistory: fetchPriceHistoryReturn
    ? vi.fn().mockReturnValue(fetchPriceHistoryReturn)
    : vi.fn(),
});
