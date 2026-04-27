import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  extractPriceData,
  findCoinGeckoId,
  getTimeRangeParams,
} from '../src/utils';

import type { CoinGeckoCoinEntry } from '../src/types';

describe('extractPriceData', () => {
  it('should extract price and 24h change with default USD currency', () => {
    const priceInfo = { usd: 0.5, usd_24h_change: 2.5 };
    const result = extractPriceData(priceInfo);

    expect(result).toEqual({ price: 0.5, change24h: 2.5 });
  });

  it('should extract price data for different currencies', () => {
    const priceInfo = {
      eur: 0.45,
      eur_24h_change: 1.2,
      gbp: 0.38,
      gbp_24h_change: -0.5,
    };

    expect(extractPriceData(priceInfo, 'EUR')).toEqual({
      price: 0.45,
      change24h: 1.2,
    });
    expect(extractPriceData(priceInfo, 'GBP')).toEqual({
      price: 0.38,
      change24h: -0.5,
    });
  });

  it('should return null when price is missing', () => {
    const priceInfo = { eur: 0.45 };
    const result = extractPriceData(priceInfo, 'USD'); // USD not in priceInfo

    expect(result).toBeNull();
  });

  it('should handle missing 24h change data', () => {
    const priceInfo = { usd: 1.0 }; // No usd_24h_change
    const result = extractPriceData(priceInfo);

    expect(result).toEqual({ price: 1.0, change24h: undefined });
  });
});

describe('findCoinGeckoId', () => {
  it('should match native token with empty platforms', () => {
    const coinsList: CoinGeckoCoinEntry[] = [
      { id: 'cardano', symbol: 'ada', name: 'Cardano', platforms: {} },
      { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', platforms: {} },
    ];

    expect(findCoinGeckoId('ada', 'Cardano', coinsList)).toBe('cardano');
    expect(findCoinGeckoId('ADA', 'CARDANO', coinsList)).toBe('cardano'); // case-insensitive
    expect(findCoinGeckoId('btc', 'Bitcoin', coinsList)).toBe('bitcoin');
  });

  it('should match token with blockchain key in platforms', () => {
    const coinsList: CoinGeckoCoinEntry[] = [
      {
        id: 'usd-coin',
        symbol: 'usdc',
        name: 'USDC',
        platforms: {
          ethereum: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          cardano:
            '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19855534443',
        },
      },
    ];

    expect(findCoinGeckoId('usdc', 'Cardano', coinsList)).toBe('usd-coin');
    expect(findCoinGeckoId('usdc', 'Ethereum', coinsList)).toBe('usd-coin');
  });

  it('should prefer blockchain-specific match over native token', () => {
    const coinsList: CoinGeckoCoinEntry[] = [
      { id: 'usdc-native', symbol: 'usdc', name: 'USDC Native', platforms: {} },
      {
        id: 'usdc-cardano',
        symbol: 'usdc',
        name: 'USDC',
        platforms: {
          cardano:
            '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19855534443',
        },
      },
    ];

    // Should prefer blockchain-specific over native
    expect(findCoinGeckoId('usdc', 'Cardano', coinsList)).toBe('usdc-cardano');
  });

  it('should prioritize symbol match over name match', () => {
    const coinsList: CoinGeckoCoinEntry[] = [
      { id: 'jambo', symbol: 'j', name: 'Jambo', platforms: { solana: 'abc' } },
      {
        id: 'jambo-2',
        symbol: 'jambo',
        name: 'JAMBO',
        platforms: { solana: 'def' },
      },
    ];

    // 'jambo' matches by symbol on jambo-2, not by name on jambo
    expect(findCoinGeckoId('jambo', 'Solana', coinsList)).toBe('jambo-2');
  });

  it('should return undefined when no relevant match exists', () => {
    const coinsList: CoinGeckoCoinEntry[] = [
      {
        id: 'dai',
        symbol: 'dai',
        name: 'Dai',
        platforms: { ethereum: '0x123' },
      },
      {
        id: 'token-a',
        symbol: 'tkn',
        name: 'Token',
        platforms: { solana: 'abc' },
      },
    ];

    // Token exists but not on the requested blockchain-prevents wrong prices
    expect(findCoinGeckoId('dai', 'Cardano', coinsList)).toBeUndefined();
    expect(findCoinGeckoId('tkn', 'Cardano', coinsList)).toBeUndefined();
    expect(findCoinGeckoId('unknown', 'Cardano', coinsList)).toBeUndefined();
  });
});

describe('getTimeRangeParams', () => {
  const mockNowMs = 1_700_000_000_000;
  const mockNowSec = Math.floor(mockNowMs / 1000);

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(mockNowMs);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    { timeRange: '24H' as const, expectedDuration: 24 * 60 * 60 },
    { timeRange: '7D' as const, expectedDuration: 7 * 24 * 60 * 60 },
    { timeRange: '1M' as const, expectedDuration: 30 * 24 * 60 * 60 },
    { timeRange: '1Y' as const, expectedDuration: 365 * 24 * 60 * 60 },
  ])(
    'should return correct timestamps for $timeRange',
    ({ timeRange, expectedDuration }) => {
      const result = getTimeRangeParams(timeRange);

      expect(result.to).toBe(mockNowSec);
      expect(result.from).toBe(mockNowSec - expectedDuration);
    },
  );
});
