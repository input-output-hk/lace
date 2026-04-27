import { TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-sdk/util';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  BitcoinTokenPriceId,
  calculatePortfolioValueOverTime,
  CardanoTokenPriceId,
  getTokenPriceId,
  shouldFetchPrice,
  shouldFetchPriceHistory,
  type TokenPriceId,
} from '../src';

import type { TokenPrice, TokenPriceHistory } from '../src';
import type { PriceDataPoint } from '../src';
import type { Address } from '@lace-contract/addresses';
import type { Token } from '@lace-contract/tokens';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { BlockchainName } from '@lace-lib/util-store';

const createMockToken = (
  tokenId: string,
  available: bigint,
  decimals: number,
  blockchainName: BlockchainName = 'Cardano',
  // eslint-disable-next-line max-params
): Token => ({
  tokenId: TokenId(tokenId),
  blockchainName,
  accountId: 'test-account' as AccountId,
  address: 'test-address' as Address,
  available: BigNumber(available),
  pending: BigNumber(0n),
  decimals,
  displayLongName: `${tokenId} Token`,
  displayShortName: tokenId.toUpperCase(),
  metadata: {
    ticker: tokenId.toUpperCase(),
    name: `${tokenId} Token`,
    decimals,
    blockchainSpecific: {},
  },
});

const createMockPrice = (lastUpdated: number): TokenPrice => ({
  priceId: CardanoTokenPriceId(TokenId('ada')),
  blockchain: 'Cardano',
  identifier: 'ada',
  price: 0.5,
  fiatCurrency: 'USD',
  lastUpdated,
});

describe('utils', () => {
  describe('getTokenPriceId', () => {
    it('should return CardanoTokenPriceId for Cardano tokens using ticker', () => {
      const token = createMockToken('ada', 1000n, 6, 'Cardano');
      const priceId = getTokenPriceId(token);
      expect(priceId).toBe(CardanoTokenPriceId('ADA'));
    });

    it('should return CardanoTokenPriceId for Cardano tokens using name when no ticker', () => {
      const token: Token = {
        ...createMockToken('some-policy-id', 1000n, 6, 'Cardano'),
        metadata: {
          name: 'My Token',
          decimals: 6,
          blockchainSpecific: {},
        },
      };
      const priceId = getTokenPriceId(token);
      expect(priceId).toBe(CardanoTokenPriceId('My Token'));
    });

    it('should return CardanoTokenPriceId using tokenId when no metadata', () => {
      const token: Token = {
        ...createMockToken('some-token-id', 1000n, 6, 'Cardano'),
        metadata: undefined,
      };
      const priceId = getTokenPriceId(token);
      expect(priceId).toBe(CardanoTokenPriceId('some-token-id'));
    });

    it('should return BitcoinTokenPriceId for Bitcoin tokens', () => {
      const token = createMockToken('btc', 100000000n, 8, 'Bitcoin');
      const priceId = getTokenPriceId(token);
      expect(priceId).toBe(BitcoinTokenPriceId('btc'));
    });

    it('should return null for unsupported blockchains', () => {
      const token = createMockToken('dust', 1000n, 6, 'Midnight');
      const priceId = getTokenPriceId(token);
      expect(priceId).toBe(null);
    });
  });

  describe('shouldFetchPrice', () => {
    const mockNow = 1_000_000_000;
    const FIVE_MINUTES_MS = 5 * 60 * 1000;

    beforeEach(() => {
      vi.spyOn(Date, 'now').mockReturnValue(mockNow);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const createMockPrice = (lastUpdated: number): TokenPrice => ({
      priceId: CardanoTokenPriceId(TokenId('ada')),
      blockchain: 'Cardano',
      identifier: 'ada',
      price: 0.5,
      fiatCurrency: 'USD',
      lastUpdated,
    });

    it('should return true when no price data exists', () => {
      expect(shouldFetchPrice(undefined)).toBe(true);
    });

    it.each([
      {
        description: 'is fresh (4 mins ago)',
        offset: 4 * 60 * 1000,
        expected: false,
      },
      {
        description: 'is exactly at the 5 min limit',
        offset: FIVE_MINUTES_MS,
        expected: false,
      },
      {
        description: 'is just over the 5 min limit',
        offset: FIVE_MINUTES_MS + 1,
        expected: true,
      },
      {
        description: 'is clearly stale (6 mins ago)',
        offset: 6 * 60 * 1000,
        expected: true,
      },
    ])(
      'should return $expected when price $description',
      ({ offset, expected }) => {
        const priceData = createMockPrice(mockNow - offset);
        expect(shouldFetchPrice(priceData)).toBe(expected);
      },
    );
  });

  describe('shouldFetchPriceHistory', () => {
    const mockNow = 1_000_000_000;
    const ONE_HOUR_MS = 60 * 60 * 1000;

    beforeEach(() => {
      vi.spyOn(Date, 'now').mockReturnValue(mockNow);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const createMockHistory = (
      timeRange: '1M' | '1Y' | '7D' | '24H',
      lastFetched: number,
      hasData = true,
    ): TokenPriceHistory => ({
      '24H': [],
      '7D': [],
      '1M': [],
      '1Y': [],
      [timeRange]: hasData
        ? [{ timestamp: 1000, price: 100, date: '01/01' }]
        : [],
      lastFetched: {
        '24H': 0,
        '7D': 0,
        '1M': 0,
        '1Y': 0,
        [timeRange]: lastFetched,
      },
    });

    it('should return true when no history exists', () => {
      expect(shouldFetchPriceHistory(undefined, '24H')).toBe(true);
    });

    it('should return true when history has no data for time range', () => {
      const history = createMockHistory('24H', mockNow, false);
      expect(shouldFetchPriceHistory(history, '24H')).toBe(true);
    });

    it('should return false when history is fresh', () => {
      const history = createMockHistory('24H', mockNow - 30 * 60 * 1000); // 30 mins ago
      expect(shouldFetchPriceHistory(history, '24H')).toBe(false);
    });

    it('should return true when history is stale', () => {
      const history = createMockHistory('24H', mockNow - ONE_HOUR_MS - 1);
      expect(shouldFetchPriceHistory(history, '24H')).toBe(true);
    });
  });

  describe('calculatePortfolioValueOverTime', () => {
    it('should calculate portfolio value across multiple timestamps', () => {
      const token1 = createMockToken('ada', 1000n * 10n ** 6n, 6); // 1000 ADA
      const token2 = createMockToken('hosky', 5000n * 10n ** 6n, 6); // 5000 HOSKY

      const priceHistory = new Map([
        [
          CardanoTokenPriceId('ADA'),
          [
            { timestamp: 1000, price: 0.5, date: '01/01' },
            { timestamp: 2000, price: 0.6, date: '01/02' },
          ],
        ],
        [
          CardanoTokenPriceId('HOSKY'),
          [
            { timestamp: 1000, price: 0.001, date: '01/01' },
            { timestamp: 2000, price: 0.002, date: '01/02' },
          ],
        ],
      ]);

      const currentPrices = {
        [CardanoTokenPriceId('ADA')]: createMockPrice(Date.now()),
        [CardanoTokenPriceId('HOSKY')]: createMockPrice(Date.now()),
      };

      const result = calculatePortfolioValueOverTime(
        priceHistory,
        [token1, token2],
        currentPrices,
      );

      expect(result).toHaveLength(2);
      // At timestamp 1000: (1000 * 0.5) + (5000 * 0.001) = 500 + 5 = 505
      expect(result[0]?.price).toBeCloseTo(505, 2);
      // At timestamp 2000: (1000 * 0.6) + (5000 * 0.002) = 600 + 10 = 610
      expect(result[1]?.price).toBeCloseTo(610, 2);
    });

    it('should use last known price when token has no data at timestamp', () => {
      const token1 = createMockToken('ada', 1000n * 10n ** 6n, 6);
      const token2 = createMockToken('hosky', 5000n * 10n ** 6n, 6);

      const priceHistory = new Map([
        [
          CardanoTokenPriceId('ADA'),
          [
            { timestamp: 1000, price: 0.5, date: '01/01' },
            { timestamp: 2000, price: 0.6, date: '01/02' },
            { timestamp: 3000, price: 0.7, date: '01/03' },
          ],
        ],
        [
          CardanoTokenPriceId('HOSKY'),
          [
            { timestamp: 1000, price: 0.001, date: '01/01' },
            // Missing timestamp 2000 and 3000
          ],
        ],
      ]);

      const currentPrices = {
        [CardanoTokenPriceId('ADA')]: createMockPrice(Date.now()),
        [CardanoTokenPriceId('HOSKY')]: createMockPrice(Date.now()),
      };

      const result = calculatePortfolioValueOverTime(
        priceHistory,
        [token1, token2],
        currentPrices,
      );

      expect(result).toHaveLength(3);
      // At timestamp 2000: uses HOSKY's last known price (0.001)
      expect(result[1]?.price).toBeCloseTo(605, 2);
      // At timestamp 3000: still uses HOSKY's last known price (0.001)
      expect(result[2]?.price).toBeCloseTo(705, 2);
    });

    it('should return empty array when no price history', () => {
      const token = createMockToken('ada', 1000n * 10n ** 6n, 6);
      const priceHistory = new Map<TokenPriceId, PriceDataPoint[]>();
      const currentPrices = {};

      const result = calculatePortfolioValueOverTime(
        priceHistory,
        [token],
        currentPrices,
      );

      expect(result).toEqual([]);
    });

    it('should return empty array when no tokens', () => {
      const priceHistory = new Map([
        [
          CardanoTokenPriceId('ADA'),
          [{ timestamp: 1000, price: 0.5, date: '01/01' }],
        ],
      ]);
      const currentPrices = {};

      const result = calculatePortfolioValueOverTime(
        priceHistory,
        [],
        currentPrices,
      );

      expect(result).toEqual([]);
    });

    it('should only include tokens with known dollar values', () => {
      const token1 = createMockToken('ada', 1000n * 10n ** 6n, 6);
      const token2 = createMockToken('unknown', 5000n * 10n ** 6n, 6);

      const priceHistory = new Map([
        [
          CardanoTokenPriceId('ADA'),
          [{ timestamp: 1000, price: 0.5, date: '01/01' }],
        ],
        // No price history for 'unknown' token
      ]);

      const currentPrices = {
        [CardanoTokenPriceId('ADA')]: createMockPrice(Date.now()),
      };

      const result = calculatePortfolioValueOverTime(
        priceHistory,
        [token1, token2],
        currentPrices,
      );

      expect(result).toHaveLength(1);
      // Only ADA's value: 1000 * 0.5 = 500
      expect(result[0]?.price).toBeCloseTo(500, 2);
    });

    it('should use current prices to initialize last known prices', () => {
      const token1 = createMockToken('ada', 1000n * 10n ** 6n, 6);
      const token2 = createMockToken('hosky', 5000n * 10n ** 6n, 6);

      // ADA has history, HOSKY doesn't
      const priceHistory = new Map([
        [
          CardanoTokenPriceId('ADA'),
          [{ timestamp: 1000, price: 0.5, date: '01/01' }],
        ],
      ]);

      // But HOSKY has a current price
      const currentPrices = {
        [CardanoTokenPriceId('ADA')]: {
          ...createMockPrice(Date.now()),
          price: 0.5,
        },
        [CardanoTokenPriceId('HOSKY')]: {
          ...createMockPrice(Date.now()),
          price: 0.001,
        },
      };

      const result = calculatePortfolioValueOverTime(
        priceHistory,
        [token1, token2],
        currentPrices,
      );

      expect(result).toHaveLength(1);
      // At timestamp 1000: (1000 * 0.5) + (5000 * 0.001) = 500 + 5 = 505
      // HOSKY uses its current price as fallback
      expect(result[0]?.price).toBeCloseTo(505, 2);
    });

    it('should update prices from history over current prices', () => {
      const token = createMockToken('ada', 1000n * 10n ** 6n, 6);

      const priceHistory = new Map([
        [
          CardanoTokenPriceId('ADA'),
          [
            { timestamp: 1000, price: 0.5, date: '01/01' },
            { timestamp: 2000, price: 0.6, date: '01/02' },
          ],
        ],
      ]);

      // Current price is different from historical
      const currentPrices = {
        [CardanoTokenPriceId('ADA')]: {
          ...createMockPrice(Date.now()),
          price: 0.7,
        },
      };

      const result = calculatePortfolioValueOverTime(
        priceHistory,
        [token],
        currentPrices,
      );

      expect(result).toHaveLength(2);
      // Historical prices should be used, not current
      expect(result[0]?.price).toBeCloseTo(500, 2); // 1000 * 0.5
      expect(result[1]?.price).toBeCloseTo(600, 2); // 1000 * 0.6
    });

    it('should calculate portfolio value for multi-chain tokens (Cardano + Bitcoin)', () => {
      const adaToken = createMockToken('ada', 1000n * 10n ** 6n, 6, 'Cardano'); // 1000 ADA
      const btcToken = createMockToken('btc', 1n * 10n ** 8n, 8, 'Bitcoin'); // 1 BTC

      const priceHistory = new Map([
        [
          CardanoTokenPriceId('ADA'),
          [
            { timestamp: 1000, price: 0.5, date: '01/01' },
            { timestamp: 2000, price: 0.6, date: '01/02' },
          ],
        ],
        [
          BitcoinTokenPriceId('btc'),
          [
            { timestamp: 1000, price: 50000, date: '01/01' },
            { timestamp: 2000, price: 60000, date: '01/02' },
          ],
        ],
      ]);

      const currentPrices = {
        [CardanoTokenPriceId('ADA')]: createMockPrice(Date.now()),
        [BitcoinTokenPriceId('btc')]: {
          ...createMockPrice(Date.now()),
          priceId: BitcoinTokenPriceId('btc'),
          blockchain: 'Bitcoin' as const,
          identifier: 'btc',
        },
      };

      const result = calculatePortfolioValueOverTime(
        priceHistory,
        [adaToken, btcToken],
        currentPrices,
      );

      expect(result).toHaveLength(2);
      // At timestamp 1000: (1000 * 0.5) + (1 * 50000) = 500 + 50000 = 50500
      expect(result[0]?.price).toBeCloseTo(50500, 0);
      // At timestamp 2000: (1000 * 0.6) + (1 * 60000) = 600 + 60000 = 60600
      expect(result[1]?.price).toBeCloseTo(60600, 0);
    });

    it('should ignore tokens from unsupported blockchains', () => {
      const adaToken = createMockToken('ada', 1000n * 10n ** 6n, 6, 'Cardano');
      const midnightToken = createMockToken(
        'dust',
        1000n * 10n ** 6n,
        6,
        'Midnight',
      );

      const priceHistory = new Map([
        [
          CardanoTokenPriceId('ADA'),
          [{ timestamp: 1000, price: 0.5, date: '01/01' }],
        ],
      ]);

      const currentPrices = {
        [CardanoTokenPriceId('ADA')]: createMockPrice(Date.now()),
      };

      const result = calculatePortfolioValueOverTime(
        priceHistory,
        [adaToken, midnightToken],
        currentPrices,
      );

      expect(result).toHaveLength(1);
      // Only ADA's value: 1000 * 0.5 = 500 (Midnight token is ignored)
      expect(result[0]?.price).toBeCloseTo(500, 2);
    });
  });
});
