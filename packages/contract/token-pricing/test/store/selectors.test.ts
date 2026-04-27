import { tokensSelectors, TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-sdk/util';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CardanoTokenPriceId, DEFAULT_CURRENCY_PREFERENCE } from '../../src';
import { tokenPricingSliceSelectors } from '../../src/store/selectors';

import type { TokenPricingState } from '../../src';
import type { Address } from '@lace-contract/addresses';
import type { State } from '@lace-contract/module';
import type {
  MultiAccountsTokensMap,
  Token,
  TokensMetadataState,
} from '@lace-contract/tokens';
import type { AccountId } from '@lace-contract/wallet-repo';

// Mock the tokens selectors
vi.mock('@lace-contract/tokens', async () => {
  const actual = await vi.importActual('@lace-contract/tokens');
  return {
    ...actual,
    tokensSelectors: {
      tokens: {
        selectAggregatedFungibleTokensForVisibleAccounts: vi.fn(),
      },
    },
  };
});

describe('selectors', () => {
  const priceId = CardanoTokenPriceId(TokenId('ada'));
  const timestamp = Date.now();
  const mockState: { tokenPricing: TokenPricingState } = {
    tokenPricing: {
      prices: {
        [priceId]: {
          priceId,
          blockchain: 'Cardano',
          identifier: 'ada',
          price: 0.5,
          fiatCurrency: 'USD',
          lastUpdated: timestamp,
          isStale: false,
        },
      },
      priceHistory: {},
      metadata: {
        lastSuccessfulUpdate: timestamp,
        isUpdating: true,
        error: { message: 'Test error', timestamp },
        failedTokenIds: [],
      },
      currencyPreference: DEFAULT_CURRENCY_PREFERENCE,
    },
  } as const;

  describe('selectPrices', () => {
    it('should select all prices', () => {
      const result =
        tokenPricingSliceSelectors.tokenPricing.selectPrices(mockState);
      expect(result).toEqual(mockState.tokenPricing.prices);
      expect(result[priceId].price).toBe(0.5);
    });
  });

  describe('selectMetadata', () => {
    it('should select metadata', () => {
      const result =
        tokenPricingSliceSelectors.tokenPricing.selectMetadata(mockState);
      expect(result).toEqual(mockState.tokenPricing.metadata);
      expect(result.isUpdating).toBe(true);
      expect(result.lastSuccessfulUpdate).toBe(timestamp);
    });
  });

  describe('selectIsUpdating', () => {
    it('should select isUpdating flag', () => {
      const isUpdating =
        tokenPricingSliceSelectors.tokenPricing.selectIsUpdating(mockState);
      expect(isUpdating).toBe(true);
    });

    it('should return false when not updating', () => {
      const notUpdatingState = {
        tokenPricing: {
          ...mockState.tokenPricing,
          metadata: {
            ...mockState.tokenPricing.metadata,
            isUpdating: false,
          },
        },
      };
      const isUpdating =
        tokenPricingSliceSelectors.tokenPricing.selectIsUpdating(
          notUpdatingState,
        );
      expect(isUpdating).toBe(false);
    });
  });

  describe('selectError', () => {
    it('should select error', () => {
      const result =
        tokenPricingSliceSelectors.tokenPricing.selectError(mockState);
      expect(result).toEqual({
        message: 'Test error',
        timestamp,
      });
    });

    it('should return null when no error', () => {
      const noErrorState = {
        tokenPricing: {
          ...mockState.tokenPricing,
          metadata: {
            ...mockState.tokenPricing.metadata,
            error: null,
          },
        },
      };
      const result =
        tokenPricingSliceSelectors.tokenPricing.selectError(noErrorState);
      expect(result).toBeNull();
    });
  });

  describe('selectLastSuccessfulUpdate', () => {
    it('should select last successful update timestamp', () => {
      const result =
        tokenPricingSliceSelectors.tokenPricing.selectLastSuccessfulUpdate(
          mockState,
        );
      expect(result).toBe(timestamp);
    });

    it('should return null when no successful update yet', () => {
      const noUpdateState = {
        tokenPricing: {
          ...mockState.tokenPricing,
          metadata: {
            ...mockState.tokenPricing.metadata,
            lastSuccessfulUpdate: null,
          },
        },
      };
      const result =
        tokenPricingSliceSelectors.tokenPricing.selectLastSuccessfulUpdate(
          noUpdateState,
        );
      expect(result).toBeNull();
    });
  });

  describe('selectIsPricingStale', () => {
    it('should return true when any price is marked as stale', () => {
      const stateWithStalePrice = {
        tokenPricing: {
          prices: {
            [priceId]: {
              ...mockState.tokenPricing.prices[priceId],
              isStale: true,
            },
          },
          priceHistory: {},
          metadata: mockState.tokenPricing.metadata,
          currencyPreference: DEFAULT_CURRENCY_PREFERENCE,
        },
      };
      const isPricingStale =
        tokenPricingSliceSelectors.tokenPricing.selectIsPricingStale(
          stateWithStalePrice,
        );
      expect(isPricingStale).toBe(true);
    });

    it('should return false when no prices are stale', () => {
      const noStaleState = {
        tokenPricing: {
          prices: {
            [priceId]: {
              ...mockState.tokenPricing.prices[priceId],
              isStale: false,
            },
          },
          priceHistory: {},
          metadata: {
            ...mockState.tokenPricing.metadata,
            error: null,
          },
          currencyPreference: DEFAULT_CURRENCY_PREFERENCE,
        },
      };
      const isPricingStale =
        tokenPricingSliceSelectors.tokenPricing.selectIsPricingStale(
          noStaleState,
        );
      expect(isPricingStale).toBe(false);
    });

    it('should return false when there are no prices', () => {
      const noPricesState = {
        tokenPricing: {
          prices: {},
          priceHistory: {},
          metadata: mockState.tokenPricing.metadata,
          currencyPreference: DEFAULT_CURRENCY_PREFERENCE,
        },
      };
      const isPricingStale =
        tokenPricingSliceSelectors.tokenPricing.selectIsPricingStale(
          noPricesState,
        );
      expect(isPricingStale).toBe(false);
    });
  });

  describe('selectHasActivePricingError', () => {
    const createTestState = ({
      hasError,
      isStale,
      hasPrices = true,
    }: {
      hasError: boolean;
      isStale: boolean;
      hasPrices?: boolean;
    }) => ({
      tokenPricing: {
        prices: hasPrices
          ? {
              [priceId]: {
                priceId,
                blockchain: 'Cardano' as const,
                identifier: 'ada',
                price: 0.5,
                fiatCurrency: 'USD',
                lastUpdated: timestamp,
                isStale,
              },
            }
          : {},
        priceHistory: {},
        metadata: {
          lastSuccessfulUpdate: hasPrices ? timestamp : null,
          isUpdating: false,
          error: hasError ? { message: 'Network error', timestamp } : null,
          failedTokenIds: [],
        },
        currencyPreference: DEFAULT_CURRENCY_PREFERENCE,
      },
    });

    it.each([
      { hasError: true, isStale: true, hasPrices: true, expected: true },
      { hasError: true, isStale: false, hasPrices: true, expected: false },
      { hasError: false, isStale: true, hasPrices: true, expected: false },
      { hasError: false, isStale: false, hasPrices: true, expected: false },
      { hasError: true, isStale: false, hasPrices: false, expected: false },
    ])(
      'should return $expected when hasError=$hasError, isStale=$isStale, hasPrices=$hasPrices',
      ({ hasError, isStale, hasPrices, expected }) => {
        const state = createTestState({ hasError, isStale, hasPrices });
        const hasActivePricingError =
          tokenPricingSliceSelectors.tokenPricing.selectHasActivePricingError(
            state,
          );
        expect(hasActivePricingError).toBe(expected);
      },
    );
  });

  describe('selectTokenPriceHistoryForRange', () => {
    const adaPriceId = CardanoTokenPriceId(TokenId('ada'));
    const btcPriceId = CardanoTokenPriceId(TokenId('btc'));
    const baseTimestamp = Date.now();

    const stateWithPriceHistory: { tokenPricing: TokenPricingState } = {
      tokenPricing: {
        prices: {},
        priceHistory: {
          [adaPriceId]: {
            '24H': [
              { timestamp: baseTimestamp - 3600000, price: 0.48, date: '1/25' },
              { timestamp: baseTimestamp - 1800000, price: 0.49, date: '1/26' },
              { timestamp: baseTimestamp, price: 0.5, date: '1/26' },
            ],
            '7D': [
              {
                timestamp: baseTimestamp - 604800000,
                price: 0.45,
                date: '1/19',
              },
              { timestamp: baseTimestamp, price: 0.5, date: '1/26' },
            ],
            '1M': [
              {
                timestamp: baseTimestamp - 2592000000,
                price: 0.4,
                date: '12/26',
              },
              { timestamp: baseTimestamp, price: 0.5, date: '1/26' },
            ],
            '1Y': [],
            lastFetched: {
              '24H': baseTimestamp,
              '7D': baseTimestamp,
              '1M': baseTimestamp,
              '1Y': 0,
            },
          },
          [btcPriceId]: {
            '24H': [{ timestamp: baseTimestamp, price: 50000, date: '1/26' }],
            '7D': [],
            '1M': [],
            '1Y': [],
            lastFetched: {
              '24H': baseTimestamp,
              '7D': 0,
              '1M': 0,
              '1Y': 0,
            },
          },
        },
        metadata: {
          lastSuccessfulUpdate: baseTimestamp,
          isUpdating: false,
          error: null,
          failedTokenIds: [],
        },
        currencyPreference: DEFAULT_CURRENCY_PREFERENCE,
      },
    };

    it('should return price history for a specific token and time range', () => {
      const result =
        tokenPricingSliceSelectors.tokenPricing.selectTokenPriceHistoryForRange(
          stateWithPriceHistory,
          { priceId: adaPriceId, timeRange: '24H' },
        );

      expect(result).toHaveLength(3);
      expect(result[0].price).toBe(0.48);
      expect(result[1].price).toBe(0.49);
      expect(result[2].price).toBe(0.5);
    });

    it('should return different data for different time ranges', () => {
      const result24H =
        tokenPricingSliceSelectors.tokenPricing.selectTokenPriceHistoryForRange(
          stateWithPriceHistory,
          { priceId: adaPriceId, timeRange: '24H' },
        );

      const result7D =
        tokenPricingSliceSelectors.tokenPricing.selectTokenPriceHistoryForRange(
          stateWithPriceHistory,
          { priceId: adaPriceId, timeRange: '7D' },
        );

      const result1M =
        tokenPricingSliceSelectors.tokenPricing.selectTokenPriceHistoryForRange(
          stateWithPriceHistory,
          { priceId: adaPriceId, timeRange: '1M' },
        );

      expect(result24H).toHaveLength(3);
      expect(result7D).toHaveLength(2);
      expect(result1M).toHaveLength(2);
    });

    it('should return empty array for time range with no data', () => {
      const result =
        tokenPricingSliceSelectors.tokenPricing.selectTokenPriceHistoryForRange(
          stateWithPriceHistory,
          { priceId: adaPriceId, timeRange: '1Y' },
        );

      expect(result).toEqual([]);
    });

    it('should return empty array for non-existent priceId', () => {
      const nonExistentPriceId = CardanoTokenPriceId(TokenId('nonexistent'));
      const result =
        tokenPricingSliceSelectors.tokenPricing.selectTokenPriceHistoryForRange(
          stateWithPriceHistory,
          { priceId: nonExistentPriceId, timeRange: '24H' },
        );

      expect(result).toEqual([]);
    });

    it('should return correct data for different tokens', () => {
      const adaResult =
        tokenPricingSliceSelectors.tokenPricing.selectTokenPriceHistoryForRange(
          stateWithPriceHistory,
          { priceId: adaPriceId, timeRange: '24H' },
        );

      const btcResult =
        tokenPricingSliceSelectors.tokenPricing.selectTokenPriceHistoryForRange(
          stateWithPriceHistory,
          { priceId: btcPriceId, timeRange: '24H' },
        );

      expect(adaResult).toHaveLength(3);
      expect(btcResult).toHaveLength(1);
      expect(adaResult[0].price).toBe(0.48);
      expect(btcResult[0].price).toBe(50000);
    });

    it('should return empty array when priceHistory is empty', () => {
      const emptyState: { tokenPricing: TokenPricingState } = {
        tokenPricing: {
          prices: {},
          priceHistory: {},
          metadata: {
            lastSuccessfulUpdate: null,
            isUpdating: false,
            error: null,
            failedTokenIds: [],
          },
          currencyPreference: DEFAULT_CURRENCY_PREFERENCE,
        },
      };

      const result =
        tokenPricingSliceSelectors.tokenPricing.selectTokenPriceHistoryForRange(
          emptyState,
          { priceId: adaPriceId, timeRange: '24H' },
        );

      expect(result).toEqual([]);
    });
  });

  describe('selectPortfolioValueHistory', () => {
    const baseTimestamp = Date.now();
    const adaPriceId = CardanoTokenPriceId(TokenId('ada'));
    const btcPriceId = CardanoTokenPriceId(TokenId('btc'));

    const createMockToken = (
      id: string,
      available: bigint,
      decimals: number,
    ): Token => ({
      tokenId: TokenId(id),
      blockchainName: 'Cardano',
      accountId: 'test-account' as AccountId,
      address: 'test-address' as Address,
      available: BigNumber(available),
      pending: BigNumber(0n),
      decimals,
      displayLongName: `${id} Token`,
      displayShortName: id.toUpperCase(),
      metadata: {
        ticker: id.toUpperCase(),
        name: `${id} Token`,
        decimals,
        blockchainSpecific: {},
      },
    });

    const setupState = (
      tokens: Token[],
      priceHistory: TokenPricingState['priceHistory'],
      prices: TokenPricingState['prices'] = {},
    ): State => {
      vi.mocked(
        tokensSelectors.tokens.selectAggregatedFungibleTokensForVisibleAccounts,
      ).mockReturnValue(tokens);
      return {
        tokenPricing: {
          prices,
          priceHistory,
          metadata: {
            lastSuccessfulUpdate: baseTimestamp,
            isUpdating: false,
            error: null,
            failedTokenIds: [],
          },
          currencyPreference: DEFAULT_CURRENCY_PREFERENCE,
        } as TokenPricingState,
        rawTokens: {} as Partial<MultiAccountsTokensMap>,
        tokensMetadata: { byTokenId: {} } as TokensMetadataState,
      } as unknown as State;
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should calculate portfolio value over time for a single token', () => {
      const tokens = [createMockToken('ada', 1000_000_000n, 6)]; // 1000 ADA
      const state = setupState(tokens, {
        [adaPriceId]: {
          '24H': [
            { timestamp: baseTimestamp - 3600, price: 0.45, date: '1/25' },
            { timestamp: baseTimestamp, price: 0.5, date: '1/26' },
          ],
          '7D': [],
          '1M': [],
          '1Y': [],
          lastFetched: { '24H': baseTimestamp, '7D': 0, '1M': 0, '1Y': 0 },
        },
      });

      const result =
        tokenPricingSliceSelectors.tokenPricing.selectPortfolioValueHistory(
          state,
          '24H',
        );

      expect(result).toHaveLength(2);
      expect(result[0].price).toBe(450); // 1000 * 0.45
      expect(result[1].price).toBe(500); // 1000 * 0.5
    });

    it('should aggregate value for multiple tokens', () => {
      const tokens = [
        createMockToken('ada', 1000_000_000n, 6), // 1000 ADA
        createMockToken('btc', 100_000_000n, 8), // 1 BTC
      ];
      const state = setupState(tokens, {
        [adaPriceId]: {
          '24H': [{ timestamp: baseTimestamp, price: 0.5, date: '1/26' }],
          '7D': [],
          '1M': [],
          '1Y': [],
          lastFetched: { '24H': baseTimestamp, '7D': 0, '1M': 0, '1Y': 0 },
        },
        [btcPriceId]: {
          '24H': [{ timestamp: baseTimestamp, price: 50000, date: '1/26' }],
          '7D': [],
          '1M': [],
          '1Y': [],
          lastFetched: { '24H': baseTimestamp, '7D': 0, '1M': 0, '1Y': 0 },
        },
      });

      const result =
        tokenPricingSliceSelectors.tokenPricing.selectPortfolioValueHistory(
          state,
          '24H',
        );

      expect(result[0].price).toBe(50500); // (1000 * 0.5) + (1 * 50000)
    });

    it('should return empty array when dependencies are missing', () => {
      expect(
        tokenPricingSliceSelectors.tokenPricing.selectPortfolioValueHistory(
          setupState([], {}),
          '24H',
        ),
      ).toEqual([]);

      const tokens = [createMockToken('ada', 1000_000_000n, 6)];
      expect(
        tokenPricingSliceSelectors.tokenPricing.selectPortfolioValueHistory(
          setupState(tokens, {}),
          '24H',
        ),
      ).toEqual([]);
    });

    it('should handle different decimal places correctly', () => {
      const tokens = [
        createMockToken('ada', 1000_000_000n, 6), // 1000 ADA
        createMockToken('dust', 1n, 0), // 1 Dust (0 decimals)
      ];
      const state = setupState(tokens, {
        [adaPriceId]: {
          '24H': [{ timestamp: baseTimestamp, price: 0.5, date: '1/26' }],
          '7D': [],
          '1M': [],
          '1Y': [],
          lastFetched: { '24H': baseTimestamp, '7D': 0, '1M': 0, '1Y': 0 },
        },
        [CardanoTokenPriceId(TokenId('dust'))]: {
          '24H': [{ timestamp: baseTimestamp, price: 10, date: '1/26' }],
          '7D': [],
          '1M': [],
          '1Y': [],
          lastFetched: { '24H': baseTimestamp, '7D': 0, '1M': 0, '1Y': 0 },
        },
      });

      const result =
        tokenPricingSliceSelectors.tokenPricing.selectPortfolioValueHistory(
          state,
          '24H',
        );
      expect(result[0].price).toBe(510); // (1000 * 0.5) + (1 * 10)
    });
  });
});
