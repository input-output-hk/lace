import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  extractPriceData,
  findCoinGeckoId,
  getTimeRangeParams,
  normalizeCurrency,
} from '../src/utils';

import type { CoinGeckoCoinEntry } from '../src/types';

describe('extractPriceData', () => {
  it('should extract price and 24h change with default USD currency', () => {
    const priceInfo = { usd: 0.5, usd_24h_change: 2.5 };
    const result = extractPriceData(priceInfo);

    expect(result).toEqual({ price: 0.5, change24h: 2.5, priceInUsd: 0.5 });
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
      priceInUsd: undefined,
    });
    expect(extractPriceData(priceInfo, 'GBP')).toEqual({
      price: 0.38,
      change24h: -0.5,
      priceInUsd: undefined,
    });
  });

  it('should return null when the requested currency key is absent', () => {
    // CoinGecko may silently omit an unsupported vs_currency; returning USD
    // values here would mislabel amounts under the user's selected currency.
    const priceInfo = { usd: 1.0, usd_24h_change: 0.3 };
    expect(extractPriceData(priceInfo, 'VEF')).toBeNull();
    expect(extractPriceData({ eur: 0.45 }, 'GBP')).toBeNull();
  });

  it('should handle missing 24h change data', () => {
    const priceInfo = { usd: 1.0 }; // No usd_24h_change
    const result = extractPriceData(priceInfo);

    expect(result).toEqual({
      price: 1.0,
      change24h: undefined,
      priceInUsd: 1.0,
    });
  });
});

describe('normalizeCurrency', () => {
  it('should lowercase valid alphabetic currency codes', () => {
    expect(normalizeCurrency('USD')).toBe('usd');
    expect(normalizeCurrency('EUR')).toBe('eur');
    expect(normalizeCurrency('ves')).toBe('ves');
  });

  it('should fall back to the default currency for malformed codes', () => {
    const defaultLower = 'usd';
    expect(normalizeCurrency('')).toBe(defaultLower);
    expect(normalizeCurrency('123')).toBe(defaultLower);
    expect(normalizeCurrency('US$')).toBe(defaultLower);
    expect(normalizeCurrency('TOOLONGCODE')).toBe(defaultLower);
  });
});

describe('findCoinGeckoId', () => {
  it('should match native token with empty platforms', () => {
    const coinsList: CoinGeckoCoinEntry[] = [
      { id: 'cardano', symbol: 'ada', name: 'Cardano', platforms: {} },
      { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', platforms: {} },
    ];

    expect(
      findCoinGeckoId({ identifier: 'ada', blockchain: 'Cardano' }, coinsList),
    ).toBe('cardano');
    expect(
      findCoinGeckoId({ identifier: 'ADA', blockchain: 'CARDANO' }, coinsList),
    ).toBe('cardano'); // case-insensitive
    expect(
      findCoinGeckoId({ identifier: 'btc', blockchain: 'Bitcoin' }, coinsList),
    ).toBe('bitcoin');
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

    expect(
      findCoinGeckoId({ identifier: 'usdc', blockchain: 'Cardano' }, coinsList),
    ).toBe('usd-coin');
    expect(
      findCoinGeckoId(
        { identifier: 'usdc', blockchain: 'Ethereum' },
        coinsList,
      ),
    ).toBe('usd-coin');
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
    expect(
      findCoinGeckoId({ identifier: 'usdc', blockchain: 'Cardano' }, coinsList),
    ).toBe('usdc-cardano');
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
    expect(
      findCoinGeckoId({ identifier: 'jambo', blockchain: 'Solana' }, coinsList),
    ).toBe('jambo-2');
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
    expect(
      findCoinGeckoId({ identifier: 'dai', blockchain: 'Cardano' }, coinsList),
    ).toBeUndefined();
    expect(
      findCoinGeckoId({ identifier: 'tkn', blockchain: 'Cardano' }, coinsList),
    ).toBeUndefined();
    expect(
      findCoinGeckoId(
        { identifier: 'unknown', blockchain: 'Cardano' },
        coinsList,
      ),
    ).toBeUndefined();
  });

  describe('with a contract address (unique AssetId)', () => {
    const coinsList: CoinGeckoCoinEntry[] = [
      {
        id: 'wrong-dip',
        symbol: 'dip',
        name: 'Wrong DIP',
        platforms: { cardano: 'aaaa1111444950' },
      },
      {
        id: 'correct-dip',
        symbol: 'dip',
        name: 'Correct DIP',
        platforms: { cardano: 'bbbb2222444950' },
      },
    ];

    it('should resolve the coin whose platform value matches the AssetId', () => {
      expect(
        findCoinGeckoId(
          {
            identifier: 'dip',
            blockchain: 'Cardano',
            contractAddress: 'bbbb2222444950',
          },
          coinsList,
        ),
      ).toBe('correct-dip');
      expect(
        findCoinGeckoId(
          {
            identifier: 'dip',
            blockchain: 'Cardano',
            contractAddress: 'aaaa1111444950',
          },
          coinsList,
        ),
      ).toBe('wrong-dip');
    });

    it('should match the platform value case-insensitively', () => {
      expect(
        findCoinGeckoId(
          {
            identifier: 'dip',
            blockchain: 'Cardano',
            contractAddress: 'BBBB2222444950',
          },
          coinsList,
        ),
      ).toBe('correct-dip');
    });

    it('should return undefined when no platform value matches the AssetId', () => {
      expect(
        findCoinGeckoId(
          {
            identifier: 'dip',
            blockchain: 'Cardano',
            contractAddress: 'cccc3333444950',
          },
          coinsList,
        ),
      ).toBeUndefined();
    });

    it('should not fall back to symbol matching when AssetId is unknown to the provider', () => {
      const listWithoutPlatform: CoinGeckoCoinEntry[] = [
        { id: 'dip-native', symbol: 'dip', name: 'DIP', platforms: {} },
      ];
      expect(
        findCoinGeckoId(
          {
            identifier: 'dip',
            blockchain: 'Cardano',
            contractAddress: 'dddd4444',
          },
          listWithoutPlatform,
        ),
      ).toBeUndefined();
    });
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
