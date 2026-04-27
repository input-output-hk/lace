/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { TokenId } from '@lace-contract/tokens';
import { testSideEffect } from '@lace-lib/util-dev';
import { dummyLogger } from 'ts-log';
import { describe, it, expect, vi } from 'vitest';

import { BitcoinTokenPriceId, tokenPricingActions } from '../../src';
import {
  clearPricesWhenDisabled,
  clearPricingDataOnTestnet,
  makePollPrices,
  makeFetchPricesForNewTokens,
  makeFetchPricesOnDemand,
  makeFetch24HPriceHistoryOnSync,
  makeFetchPriceHistoryOnDemand,
} from '../../src/store/side-effects';
import { CardanoTokenPriceId } from '../../src/value-objects';
import {
  createMockToken,
  createMockResponse,
  createMockProvider,
  createMockPriceHistoryResponse,
} from '../test-helpers';

import type { SetPricesPayload } from '../../src';
import type { TokenIdMapper, TokenPriceRequest } from '../../src/types';
import type { NetworkType } from '@lace-contract/network';
import type { Token } from '@lace-contract/tokens';
import type { ByBlockchainNameSelector } from '@lace-lib/util-store';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { MockedFunction } from 'vitest';

const logger = dummyLogger;

/**
 * Creates a mock selectMapper for testing.
 * Returns appropriate mappers for Cardano and Bitcoin blockchains.
 */
const createMockSelectMapper = (): ByBlockchainNameSelector<TokenIdMapper> => {
  const cardanoMapper: TokenIdMapper = {
    blockchainName: 'Cardano',
    getTokenPriceId: (token: Token) => CardanoTokenPriceId(token.tokenId),
    getTokenPriceRequest: (
      token: Token,
      fiatCurrency: string,
    ): TokenPriceRequest => ({
      priceId: CardanoTokenPriceId(token.tokenId),
      blockchain: 'Cardano',
      identifier: token.tokenId,
      fiatCurrency,
    }),
  };

  const bitcoinMapper: TokenIdMapper = {
    blockchainName: 'Bitcoin',
    getTokenPriceId: (token: Token) => BitcoinTokenPriceId(token.tokenId),
    getTokenPriceRequest: (
      token: Token,
      fiatCurrency: string,
    ): TokenPriceRequest => ({
      priceId: BitcoinTokenPriceId(token.tokenId),
      blockchain: 'Bitcoin',
      identifier: token.tokenId,
      fiatCurrency,
    }),
  };

  const mappers: Record<string, TokenIdMapper> = {
    Cardano: cardanoMapper,
    Bitcoin: bitcoinMapper,
  };

  return (blockchainName: string) => mappers[blockchainName];
};

// Create side effects with the mock mapper
const selectMapper = createMockSelectMapper();
const pollPrices = makePollPrices(selectMapper);
const fetchPricesForNewTokens = makeFetchPricesForNewTokens(selectMapper);
const fetchPricesOnDemand = makeFetchPricesOnDemand(selectMapper);
const fetch24HPriceHistoryOnSync = makeFetch24HPriceHistoryOnSync(selectMapper);
const fetchPriceHistoryOnDemand = makeFetchPriceHistoryOnDemand(selectMapper);

describe('side-effects', () => {
  describe('clearPricesWhenDisabled', () => {
    it('should emit clearPrices and clearPriceHistory actions when provider is disabled', () => {
      const priceId = CardanoTokenPriceId(TokenId('ada'));
      const prices = {
        [priceId]: {
          priceId,
          blockchain: 'Cardano' as const,
          identifier: 'ada',
          price: 0.5,
          fiatCurrency: 'USD',
          lastUpdated: Date.now(),
        },
      };

      testSideEffect(clearPricesWhenDisabled, ({ cold, expectObservable }) => ({
        stateObservables: {
          tokenPricing: {
            selectPrices$: cold('a|', { a: prices }),
          },
        },
        dependencies: {
          tokenPricingProvider: undefined,
          actions: tokenPricingActions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab|)', {
            a: tokenPricingActions.tokenPricing.clearPrices(),
            b: tokenPricingActions.tokenPricing.clearPriceHistory(),
          });
        },
      }));
    });

    it('should return EMPTY when provider is available', () => {
      const mockProvider = createMockProvider();

      testSideEffect(clearPricesWhenDisabled, ({ cold, expectObservable }) => ({
        stateObservables: {
          tokenPricing: {
            selectPrices$: cold('a', { a: {} }),
          },
        },
        dependencies: {
          tokenPricingProvider: mockProvider,
          actions: tokenPricingActions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('|');
        },
      }));
    });
  });

  describe('clearPricingDataOnTestnet', () => {
    it('should emit clearPrices and clearPriceHistory actions when on testnet', () => {
      testSideEffect(
        clearPricingDataOnTestnet,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            network: {
              selectNetworkType$: cold<NetworkType>('a', { a: 'testnet' }),
            },
          },
          dependencies: {
            actions: tokenPricingActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: tokenPricingActions.tokenPricing.clearPrices(),
              b: tokenPricingActions.tokenPricing.clearPriceHistory(),
            });
          },
        }),
      );
    });

    it('should emit clear actions when switching from mainnet to testnet', () => {
      testSideEffect(
        clearPricingDataOnTestnet,
        ({ hot, expectObservable }) => ({
          stateObservables: {
            network: {
              // Start on mainnet, then switch to testnet
              selectNetworkType$: hot<NetworkType>('a--b', {
                a: 'mainnet',
                b: 'testnet',
              }),
            },
          },
          dependencies: {
            actions: tokenPricingActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('---(ab)', {
              a: tokenPricingActions.tokenPricing.clearPrices(),
              b: tokenPricingActions.tokenPricing.clearPriceHistory(),
            });
          },
        }),
      );
    });

    it('should return EMPTY when on mainnet', () => {
      testSideEffect(
        clearPricingDataOnTestnet,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            network: {
              selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
            },
          },
          dependencies: {
            actions: tokenPricingActions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
        }),
      );
    });
  });

  describe('pollPrices', () => {
    it('should return EMPTY when provider is not available', () => {
      testSideEffect(pollPrices, ({ cold, expectObservable }) => ({
        stateObservables: {
          sync: {
            selectGlobalSyncStatus$: cold('a', { a: 'synced' as const }),
          },
          tokens: {
            selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
              a: [],
            }),
          },
          tokenPricing: {
            selectPrices$: cold('a', { a: {} }),
          },
          network: {
            selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
          },
        },
        dependencies: {
          tokenPricingProvider: undefined,
          actions: tokenPricingActions,
          logger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('|');
        },
      }));
    });

    it('should return EMPTY when on testnet', () => {
      const token = createMockToken('ada');
      const responses = [createMockResponse('ada', 0.5)];

      testSideEffect(pollPrices, ({ cold, hot, expectObservable }) => {
        const mockProvider = createMockProvider(cold('a|', { a: responses }));

        return {
          stateObservables: {
            sync: {
              selectGlobalSyncStatus$: hot('a', { a: 'synced' as const }),
            },
            tokens: {
              selectAggregatedFungibleTokensForVisibleAccounts$: hot('a', {
                a: [token],
              }),
            },
            tokenPricing: {
              selectPrices$: hot('a', { a: {} }),
            },
            network: {
              selectNetworkType$: hot<NetworkType>('a', { a: 'testnet' }),
            },
          },
          dependencies: {
            tokenPricingProvider: mockProvider,
            actions: tokenPricingActions,
            logger,
          },
          assertion: sideEffect$ => {
            // Should not poll when on testnet
            expectObservable(sideEffect$, '^ 120000ms !').toBe('');
          },
        };
      });
    });

    it('should poll prices repeatedly while synced', () => {
      const token = createMockToken('ada');
      const responses = [createMockResponse('ada', 0.5)];

      testSideEffect(pollPrices, ({ cold, hot, expectObservable }) => {
        const mockProvider = createMockProvider(cold('a|', { a: responses }));

        return {
          stateObservables: {
            sync: {
              selectGlobalSyncStatus$: hot('a', { a: 'synced' as const }),
            },
            tokens: {
              selectAggregatedFungibleTokensForVisibleAccounts$: hot('a', {
                a: [token],
              }),
            },
            tokenPricing: {
              // No existing prices, so shouldFetchPrice will return true
              selectPrices$: hot('a', { a: {} }),
            },
            network: {
              selectNetworkType$: hot<NetworkType>('a', { a: 'mainnet' }),
            },
          },
          dependencies: {
            tokenPricingProvider: mockProvider,
            actions: tokenPricingActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$, '^ 120000ms !').toBe(
              '60000ms (ab)  59996ms (ab)',
              {
                a: tokenPricingActions.tokenPricing.startUpdate(),
                b: expect.objectContaining({
                  type: 'tokenPricing/setPrices',
                }) as PayloadAction<SetPricesPayload>,
              },
            );
          },
        };
      });
    });

    it('should restart polling when sync status flips from synced to not synced to synced', () => {
      const token = createMockToken('ada');
      const responses = [createMockResponse('ada', 0.5)];

      testSideEffect(pollPrices, ({ cold, hot, expectObservable }) => {
        const mockProvider = createMockProvider(cold('a|', { a: responses }));

        return {
          stateObservables: {
            sync: {
              // Start synced, then go to syncing, then back to synced
              // 'a' at frame 0, 'b' at frame 30001, 'c' at frame 60002
              selectGlobalSyncStatus$: hot('a 30000ms b 30000ms c', {
                a: 'synced' as const,
                b: 'syncing' as const,
                c: 'synced' as const,
              }),
            },
            tokens: {
              // Emit at frame 0 and again at frame 60005 (after interval 2 subscribes at frame 60002)
              selectAggregatedFungibleTokensForVisibleAccounts$: hot(
                'a 60004ms a',
                {
                  a: [token],
                },
              ),
            },
            tokenPricing: {
              // Emit at frame 0 and again at frame 60005 (after interval 2 subscribes at frame 60002)
              selectPrices$: hot('a 60004ms a', { a: {} }),
            },
            network: {
              // Emit at frame 0 and again at frame 60005 (after interval 2 subscribes at frame 60002)
              selectNetworkType$: hot<NetworkType>('a 60004ms a', {
                a: 'mainnet',
              }),
            },
          },
          dependencies: {
            tokenPricingProvider: mockProvider,
            actions: tokenPricingActions,
            logger,
          },
          assertion: sideEffect$ => {
            // First emission at frame 60000 (interval 1 tick, startWith(0) is dropped because withLatestFrom doesn't have values yet)
            // At frame 60002, sync goes back to synced, switchMap switches to new interval
            // Second emission at frame 120002 (interval 2 tick: 60002 + 60000)
            expectObservable(sideEffect$, '^ 130000ms !').toBe(
              '60000ms (ab) 59998ms (cd)',
              {
                a: tokenPricingActions.tokenPricing.startUpdate(),
                b: expect.objectContaining({
                  type: 'tokenPricing/setPrices',
                }) as PayloadAction<SetPricesPayload>,
                c: tokenPricingActions.tokenPricing.startUpdate(),
                d: expect.objectContaining({
                  type: 'tokenPricing/setPrices',
                }) as PayloadAction<SetPricesPayload>,
              },
            );
          },
        };
      });
    });

    it('should filter to only Cardano tokens', () => {
      const cardanoToken = createMockToken('ada');
      const nonCardanoToken: Token = {
        ...createMockToken('eth'),
        blockchainName: 'Bitcoin',
      };
      const responses = [createMockResponse('ada', 0.5)];

      testSideEffect(pollPrices, ({ cold, hot, expectObservable }) => {
        const mockProvider = createMockProvider(cold('a|', { a: responses }));

        return {
          stateObservables: {
            sync: {
              selectGlobalSyncStatus$: hot('a', { a: 'synced' as const }),
            },
            tokens: {
              selectAggregatedFungibleTokensForVisibleAccounts$: hot('a', {
                a: [cardanoToken, nonCardanoToken],
              }),
            },
            tokenPricing: {
              selectPrices$: hot('a', { a: {} }),
            },
            network: {
              selectNetworkType$: hot<NetworkType>('a', { a: 'mainnet' }),
            },
          },
          dependencies: {
            tokenPricingProvider: mockProvider,
            actions: tokenPricingActions,
            logger,
          },
          assertion: sideEffect$ => {
            // First emission at frame 60000 (startWith(0) is dropped because withLatestFrom doesn't have values yet)
            expectObservable(sideEffect$, '^ 60001ms !').toBe('60000ms (ab)', {
              a: tokenPricingActions.tokenPricing.startUpdate(),
              b: expect.objectContaining({
                type: 'tokenPricing/setPrices',
              }) as PayloadAction<SetPricesPayload>,
            });
          },
        };
      });
    });

    it('should emit startUpdate and setPrices actions when prices are fetched successfully', () => {
      const token1 = createMockToken('ada');
      const token2 = createMockToken('min');
      const responses = [
        createMockResponse('ada', 0.5),
        createMockResponse('min', 0.02),
      ];

      testSideEffect(pollPrices, ({ cold, hot, expectObservable }) => {
        const mockProvider = createMockProvider(cold('a|', { a: responses }));

        return {
          stateObservables: {
            sync: {
              selectGlobalSyncStatus$: hot('a', { a: 'synced' as const }),
            },
            tokens: {
              selectAggregatedFungibleTokensForVisibleAccounts$: hot('a', {
                a: [token1, token2],
              }),
            },
            tokenPricing: {
              selectPrices$: hot('a', { a: {} }),
            },
            network: {
              selectNetworkType$: hot<NetworkType>('a', { a: 'mainnet' }),
            },
          },
          dependencies: {
            tokenPricingProvider: mockProvider,
            actions: tokenPricingActions,
            logger,
          },
          assertion: sideEffect$ => {
            // First emission at frame 60000 (startWith(0) is dropped because withLatestFrom doesn't have values yet)
            expectObservable(sideEffect$, '^ 60001ms !').toBe('60000ms (ab)', {
              a: tokenPricingActions.tokenPricing.startUpdate(),
              b: expect.objectContaining({
                type: 'tokenPricing/setPrices',
                payload: expect.objectContaining({
                  prices: expect.arrayContaining([
                    expect.objectContaining({
                      identifier: 'ada',
                      price: 0.5,
                    }),
                    expect.objectContaining({
                      identifier: 'min',
                      price: 0.02,
                    }),
                  ]),
                }),
              }) as PayloadAction<SetPricesPayload>,
            });
          },
        };
      });
    });

    it('should emit setError action when price fetch fails', () => {
      const token = createMockToken('ada');
      const error = new Error('Network error');

      testSideEffect(pollPrices, ({ cold, hot, expectObservable }) => {
        const mockProvider = createMockProvider(cold('#', {}, error));

        return {
          stateObservables: {
            sync: {
              selectGlobalSyncStatus$: hot('a', { a: 'synced' as const }),
            },
            tokens: {
              selectAggregatedFungibleTokensForVisibleAccounts$: hot('a', {
                a: [token],
              }),
            },
            tokenPricing: {
              selectPrices$: hot('a', { a: {} }),
            },
            network: {
              selectNetworkType$: hot<NetworkType>('a', { a: 'mainnet' }),
            },
          },
          dependencies: {
            tokenPricingProvider: mockProvider,
            actions: tokenPricingActions,
            logger,
          },
          assertion: sideEffect$ => {
            // First emission at frame 60000 (startWith(0) is dropped because withLatestFrom doesn't have values yet)
            expectObservable(sideEffect$, '^ 60001ms !').toBe('60000ms (ab)', {
              a: tokenPricingActions.tokenPricing.startUpdate(),
              b: tokenPricingActions.tokenPricing.setError({
                error: {
                  message: 'Network error',

                  timestamp: expect.any(Number),
                },
              }),
            });
          },
        };
      });
    });

    it('should convert tokens to price requests and filter by TTL', () => {
      const oldTimestamp = Date.now() - 310000; // Older than TTL (5 minutes)
      const recentTimestamp = Date.now() - 30000; // Within TTL

      const token1 = createMockToken('ada');
      const token2 = createMockToken('min');
      const token3 = createMockToken('hosky');

      const adaPriceId = CardanoTokenPriceId(TokenId('ada'));
      const minPriceId = CardanoTokenPriceId(TokenId('min'));

      const existingPrices = {
        [adaPriceId]: {
          priceId: adaPriceId,
          blockchain: 'Cardano' as const,
          identifier: 'ada',
          price: 0.5,
          fiatCurrency: 'USD',
          lastUpdated: oldTimestamp, // Stale - should fetch
        },
        [minPriceId]: {
          priceId: minPriceId,
          blockchain: 'Cardano' as const,
          identifier: 'min',
          price: 0.02,
          fiatCurrency: 'USD',
          lastUpdated: recentTimestamp, // Fresh - should not fetch
        },
        // hosky has no price - should fetch
      };

      const responses = [
        createMockResponse('ada', 0.52),
        createMockResponse('hosky', 0.001),
      ];

      testSideEffect(pollPrices, ({ cold, hot, expectObservable }) => {
        const mockProvider = createMockProvider(cold('a|', { a: responses }));

        return {
          stateObservables: {
            sync: {
              selectGlobalSyncStatus$: hot('a', { a: 'synced' as const }),
            },
            tokens: {
              selectAggregatedFungibleTokensForVisibleAccounts$: hot('a', {
                a: [token1, token2, token3],
              }),
            },
            tokenPricing: {
              selectPrices$: hot('a', { a: existingPrices }),
            },
            network: {
              selectNetworkType$: hot<NetworkType>('a', { a: 'mainnet' }),
            },
          },
          dependencies: {
            tokenPricingProvider: mockProvider,
            actions: tokenPricingActions,
            logger,
          },
          assertion: sideEffect$ => {
            // First emission at frame 60000 (startWith(0) is dropped because withLatestFrom doesn't have values yet)
            expectObservable(sideEffect$, '^ 60001ms !').toBe('60000ms (ab)', {
              a: tokenPricingActions.tokenPricing.startUpdate(),
              b: expect.objectContaining({
                type: 'tokenPricing/setPrices',
              }) as PayloadAction<SetPricesPayload>,
            });

            // Verify fetchPrices was called with only stale/missing tokens (ada and hosky)
            // Not called with min since it's fresh
            setTimeout(() => {
              expect(mockProvider.fetchPrices).toHaveBeenCalled();
              const callArgs = (
                mockProvider.fetchPrices as MockedFunction<
                  typeof mockProvider.fetchPrices
                >
              ).mock.calls[0][0];
              expect(callArgs).toHaveLength(2);
              expect(callArgs.map(r => r.identifier)).toEqual(
                expect.arrayContaining(['ada', 'hosky']),
              );
              expect(callArgs.map(r => r.identifier)).not.toContain('min');
            }, 10);
          },
        };
      });
    });

    it('should return EMPTY when no tokens need fetching due to TTL', () => {
      const recentTimestamp = Date.now() - 30000; // Within TTL

      const token = createMockToken('ada');
      const adaPriceId = CardanoTokenPriceId(TokenId('ada'));

      const existingPrices = {
        [adaPriceId]: {
          priceId: adaPriceId,
          blockchain: 'Cardano' as const,
          identifier: 'ada',
          price: 0.5,
          fiatCurrency: 'USD',
          lastUpdated: recentTimestamp, // Fresh - should not fetch
        },
      };

      testSideEffect(pollPrices, ({ hot, expectObservable }) => {
        const mockProvider = createMockProvider();

        return {
          stateObservables: {
            sync: {
              selectGlobalSyncStatus$: hot('a', { a: 'synced' as const }),
            },
            tokens: {
              selectAggregatedFungibleTokensForVisibleAccounts$: hot('a', {
                a: [token],
              }),
            },
            tokenPricing: {
              selectPrices$: hot('a', { a: existingPrices }),
            },
            network: {
              selectNetworkType$: hot<NetworkType>('a', { a: 'mainnet' }),
            },
          },
          dependencies: {
            tokenPricingProvider: mockProvider,
            actions: tokenPricingActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$, '^ 1ms !').toBe('');

            // Verify fetchPrices was never called
            setTimeout(() => {
              expect(mockProvider.fetchPrices).not.toHaveBeenCalled();
            }, 10);
          },
        };
      });
    });
  });

  describe('fetchPricesForNewTokens', () => {
    it('should return EMPTY when provider is not available', () => {
      testSideEffect(fetchPricesForNewTokens, ({ cold, expectObservable }) => ({
        stateObservables: {
          tokens: {
            selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
              a: [],
            }),
          },
          tokenPricing: {
            selectPrices$: cold('a', { a: {} }),
          },
          network: {
            selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
          },
        },
        dependencies: {
          tokenPricingProvider: undefined,
          actions: tokenPricingActions,
          logger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('|');
        },
      }));
    });

    it('should return EMPTY when on testnet', () => {
      const tokens = [createMockToken('ada')];
      const responses = [createMockResponse('ada', 0.5)];

      testSideEffect(fetchPricesForNewTokens, ({ cold, expectObservable }) => ({
        stateObservables: {
          tokens: {
            selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
              a: tokens,
            }),
          },
          tokenPricing: {
            selectPrices$: cold('a', { a: {} }),
          },
          network: {
            selectNetworkType$: cold<NetworkType>('a', { a: 'testnet' }),
          },
        },
        dependencies: {
          tokenPricingProvider: createMockProvider(
            cold('a|', { a: responses }),
          ),
          actions: tokenPricingActions,
          logger,
        },
        assertion: sideEffect$ => {
          // Should emit nothing when on testnet
          expectObservable(sideEffect$).toBe('');
        },
      }));
    });

    it('should return EMPTY when all tokens have prices', () => {
      const adaPriceId = CardanoTokenPriceId(TokenId('ada'));
      const existingPrices = {
        [adaPriceId]: {
          priceId: adaPriceId,
          blockchain: 'Cardano' as const,
          identifier: 'ada',
          price: 0.5,
          fiatCurrency: 'USD',
          lastUpdated: Date.now(),
        },
      };
      const tokens = [createMockToken('ada')];

      testSideEffect(fetchPricesForNewTokens, ({ cold, expectObservable }) => ({
        stateObservables: {
          tokens: {
            selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
              a: tokens,
            }),
          },
          tokenPricing: {
            selectPrices$: cold('a', { a: existingPrices }),
          },
          network: {
            selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
          },
        },
        dependencies: {
          tokenPricingProvider: createMockProvider(),
          actions: tokenPricingActions,
          logger,
        },
        assertion: sideEffect$ => {
          // Should emit nothing when all tokens already have prices
          expectObservable(sideEffect$).toBe('');
        },
      }));
    });

    it('should fetch prices for new tokens without existing prices', () => {
      const adaPriceId = CardanoTokenPriceId(TokenId('ada'));
      const existingPrices = {
        [adaPriceId]: {
          priceId: adaPriceId,
          blockchain: 'Cardano' as const,
          identifier: 'ada',
          price: 0.5,
          fiatCurrency: 'USD',
          lastUpdated: Date.now(),
        },
      };
      const tokens = [createMockToken('ada'), createMockToken('min')];
      const responses = [createMockResponse('min', 0.02)];

      testSideEffect(fetchPricesForNewTokens, ({ cold, expectObservable }) => ({
        stateObservables: {
          tokens: {
            selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
              a: tokens,
            }),
          },
          tokenPricing: {
            selectPrices$: cold('a', { a: existingPrices }),
          },
          network: {
            selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
          },
        },
        dependencies: {
          tokenPricingProvider: createMockProvider(
            cold('a|', { a: responses }),
          ),
          actions: tokenPricingActions,
          logger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: expect.objectContaining({
              type: 'tokenPricing/setPrices',
            }) as PayloadAction<SetPricesPayload>,
          });
        },
      }));
    });
  });

  describe('fetchPricesOnDemand', () => {
    it('should return EMPTY when provider is not available', () => {
      testSideEffect(fetchPricesOnDemand, ({ cold, expectObservable }) => ({
        actionObservables: {
          tokenPricing: {
            setCurrencyPreference$: cold('a', {
              a: tokenPricingActions.tokenPricing.setCurrencyPreference({
                name: 'EUR',
                ticker: 'EUR',
              }),
            }),
          },
        },
        stateObservables: {
          tokens: {
            selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
              a: [createMockToken('ada')],
            }),
          },
          tokenPricing: {
            selectCurrencyPreference$: cold('a', {
              a: { name: 'EUR', ticker: 'EUR' },
            }),
          },
          network: {
            selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
          },
        },
        dependencies: {
          tokenPricingProvider: undefined,
          actions: tokenPricingActions,
          logger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('|');
        },
      }));
    });

    it('should fetch prices with selected currency', () => {
      testSideEffect(fetchPricesOnDemand, ({ cold, expectObservable }) => {
        const mockProvider = createMockProvider(
          cold('a|', { a: [createMockResponse('ada', 0.5)] }),
        );

        return {
          actionObservables: {
            tokenPricing: {
              setCurrencyPreference$: cold('a', {
                a: tokenPricingActions.tokenPricing.setCurrencyPreference({
                  name: 'EUR',
                  ticker: 'EUR',
                }),
              }),
            },
          },
          stateObservables: {
            tokens: {
              selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
                a: [createMockToken('ada')],
              }),
            },
            tokenPricing: {
              selectCurrencyPreference$: cold('a', {
                a: { name: 'EUR', ticker: 'EUR' },
              }),
            },
            network: {
              selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
            },
          },
          dependencies: {
            tokenPricingProvider: mockProvider,
            actions: tokenPricingActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(abc)', {
              a: tokenPricingActions.tokenPricing.clearPrices(),
              b: tokenPricingActions.tokenPricing.startUpdate(),
              c: expect.objectContaining({ type: 'tokenPricing/setPrices' }),
            });

            setTimeout(() => {
              expect(mockProvider.fetchPrices).toHaveBeenCalledWith(
                expect.arrayContaining([
                  expect.objectContaining({ fiatCurrency: 'EUR' }),
                ]),
              );
            }, 10);
          },
        };
      });
    });

    it('should clear prices even when there are no visible tokens', () => {
      testSideEffect(fetchPricesOnDemand, ({ cold, expectObservable }) => {
        const mockProvider = createMockProvider();

        return {
          actionObservables: {
            tokenPricing: {
              setCurrencyPreference$: cold('a', {
                a: tokenPricingActions.tokenPricing.setCurrencyPreference({
                  name: 'EUR',
                  ticker: 'EUR',
                }),
              }),
            },
          },
          stateObservables: {
            tokens: {
              selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
                a: [],
              }),
            },
            tokenPricing: {
              selectCurrencyPreference$: cold('a', {
                a: { name: 'EUR', ticker: 'EUR' },
              }),
            },
            network: {
              selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
            },
          },
          dependencies: {
            tokenPricingProvider: mockProvider,
            actions: tokenPricingActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: tokenPricingActions.tokenPricing.clearPrices(),
            });
          },
        };
      });
    });
  });

  describe('fetch24HPriceHistoryOnSync', () => {
    it('should return EMPTY when preconditions are not met', () => {
      const token = createMockToken('ada');

      // Test 1: No provider
      testSideEffect(
        fetch24HPriceHistoryOnSync,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            sync: {
              selectGlobalSyncStatus$: cold('a', { a: 'synced' as const }),
            },
            tokens: {
              selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
                a: [token],
              }),
            },
            tokenPricing: {
              selectPriceHistory$: cold('a', { a: {} }),
            },
            network: {
              selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
            },
          },
          dependencies: {
            tokenPricingProvider: undefined,
            actions: tokenPricingActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('|');
          },
        }),
      );

      // Test 2: Not synced
      testSideEffect(
        fetch24HPriceHistoryOnSync,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            sync: {
              selectGlobalSyncStatus$: cold('a', { a: 'syncing' as const }),
            },
            tokens: {
              selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
                a: [token],
              }),
            },
            tokenPricing: {
              selectPriceHistory$: cold('a', { a: {} }),
            },
            network: {
              selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
            },
          },
          dependencies: {
            tokenPricingProvider: createMockProvider(),
            actions: tokenPricingActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
        }),
      );

      // Test 3: No tokens
      testSideEffect(
        fetch24HPriceHistoryOnSync,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            sync: {
              selectGlobalSyncStatus$: cold('a', { a: 'synced' as const }),
            },
            tokens: {
              selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
                a: [],
              }),
            },
            tokenPricing: {
              selectPriceHistory$: cold('a', { a: {} }),
            },
            network: {
              selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
            },
          },
          dependencies: {
            tokenPricingProvider: createMockProvider(),
            actions: tokenPricingActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
        }),
      );

      // Test 4: On testnet
      testSideEffect(
        fetch24HPriceHistoryOnSync,
        ({ cold, expectObservable }) => ({
          stateObservables: {
            sync: {
              selectGlobalSyncStatus$: cold('a', { a: 'synced' as const }),
            },
            tokens: {
              selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
                a: [token],
              }),
            },
            tokenPricing: {
              selectPriceHistory$: cold('a', { a: {} }),
            },
            network: {
              selectNetworkType$: cold<NetworkType>('a', { a: 'testnet' }),
            },
          },
          dependencies: {
            tokenPricingProvider: createMockProvider(),
            actions: tokenPricingActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
        }),
      );
    });

    it('should fetch 24H price history for Cardano tokens only', () => {
      const cardanoToken1 = createMockToken('ada');
      const cardanoToken2 = createMockToken('min');
      const nonCardanoToken: Token = {
        ...createMockToken('eth'),
        blockchainName: 'Bitcoin',
      };
      const responses = [
        createMockPriceHistoryResponse('ada', '24H'),
        createMockPriceHistoryResponse('min', '24H'),
      ];

      testSideEffect(
        fetch24HPriceHistoryOnSync,
        ({ cold, expectObservable }) => {
          const mockProvider = createMockProvider(
            undefined,
            cold('a|', { a: responses }),
          );

          return {
            stateObservables: {
              sync: {
                selectGlobalSyncStatus$: cold('a', { a: 'synced' as const }),
              },
              tokens: {
                selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
                  a: [cardanoToken1, cardanoToken2, nonCardanoToken],
                }),
              },
              tokenPricing: {
                selectPriceHistory$: cold('a', { a: {} }),
              },
              network: {
                selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
              },
            },
            dependencies: {
              tokenPricingProvider: mockProvider,
              actions: tokenPricingActions,
              logger,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('(ab)', {
                a: expect.objectContaining({
                  type: 'tokenPricing/setPriceHistory',
                  payload: expect.objectContaining({
                    priceId: CardanoTokenPriceId(TokenId('ada')),
                    timeRange: '24H',
                  }),
                }),
                b: expect.objectContaining({
                  type: 'tokenPricing/setPriceHistory',
                  payload: expect.objectContaining({
                    priceId: CardanoTokenPriceId(TokenId('min')),
                    timeRange: '24H',
                  }),
                }),
              });

              // Verify only Cardano tokens were requested
              setTimeout(() => {
                expect(mockProvider.fetchPriceHistory).toHaveBeenCalledWith(
                  expect.arrayContaining([
                    expect.objectContaining({ identifier: 'ada' }),
                    expect.objectContaining({ identifier: 'min' }),
                  ]),
                  '24H',
                );
              }, 10);
            },
          };
        },
      );
    });

    it('should respect TTL and skip fresh price history', () => {
      const token = createMockToken('ada');
      const priceId = CardanoTokenPriceId(TokenId('ada'));
      const recentTimestamp = Date.now() - 30000; // 30 seconds ago (within TTL)

      const existingPriceHistory = {
        [priceId]: {
          '24H': createMockPriceHistoryResponse('ada', '24H').data,
          '7D': [],
          '1M': [],
          '1Y': [],
          lastFetched: {
            '24H': recentTimestamp,
            '7D': 0,
            '1M': 0,
            '1Y': 0,
          },
        },
      };

      testSideEffect(
        fetch24HPriceHistoryOnSync,
        ({ cold, expectObservable }) => {
          const mockProvider = createMockProvider();

          return {
            stateObservables: {
              sync: {
                selectGlobalSyncStatus$: cold('a', { a: 'synced' as const }),
              },
              tokens: {
                selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
                  a: [token],
                }),
              },
              tokenPricing: {
                selectPriceHistory$: cold('a', { a: existingPriceHistory }),
              },
              network: {
                selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
              },
            },
            dependencies: {
              tokenPricingProvider: mockProvider,
              actions: tokenPricingActions,
              logger,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('');

              // Verify fetchPriceHistory was never called
              setTimeout(() => {
                expect(mockProvider.fetchPriceHistory).not.toHaveBeenCalled();
              }, 10);
            },
          };
        },
      );
    });

    it('should handle errors gracefully', () => {
      const token = createMockToken('ada');
      const error = new Error('Network error');

      testSideEffect(
        fetch24HPriceHistoryOnSync,
        ({ cold, expectObservable }) => {
          const mockProvider = createMockProvider(
            undefined,
            cold('#', {}, error),
          );
          const logErrorSpy = vi.spyOn(logger, 'error');

          return {
            stateObservables: {
              sync: {
                selectGlobalSyncStatus$: cold('a', { a: 'synced' as const }),
              },
              tokens: {
                selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
                  a: [token],
                }),
              },
              tokenPricing: {
                selectPriceHistory$: cold('a', { a: {} }),
              },
              network: {
                selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
              },
            },
            dependencies: {
              tokenPricingProvider: mockProvider,
              actions: tokenPricingActions,
              logger,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('');

              // Verify error was logged
              setTimeout(() => {
                expect(logErrorSpy).toHaveBeenCalledWith(
                  'Failed to fetch price history:',
                  error,
                );
              }, 10);
            },
          };
        },
      );
    });
  });

  describe('fetchPriceHistoryOnDemand', () => {
    it('should return EMPTY when preconditions are not met', () => {
      const token = createMockToken('ada');

      // Test 1: No provider
      testSideEffect(
        fetchPriceHistoryOnDemand,
        ({ cold, expectObservable }) => ({
          actionObservables: {
            tokenPricing: {
              requestPriceHistory$: cold('a', {
                a: tokenPricingActions.tokenPricing.requestPriceHistory({
                  timeRange: '7D',
                }),
              }),
            },
          },
          stateObservables: {
            tokens: {
              selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
                a: [token],
              }),
            },
            tokenPricing: {
              selectPriceHistory$: cold('a', { a: {} }),
            },
            network: {
              selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
            },
          },
          dependencies: {
            tokenPricingProvider: undefined,
            actions: tokenPricingActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('|');
          },
        }),
      );

      // Test 2: No tokens
      testSideEffect(
        fetchPriceHistoryOnDemand,
        ({ cold, expectObservable }) => ({
          actionObservables: {
            tokenPricing: {
              requestPriceHistory$: cold('a', {
                a: tokenPricingActions.tokenPricing.requestPriceHistory({
                  timeRange: '7D',
                }),
              }),
            },
          },
          stateObservables: {
            tokens: {
              selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
                a: [],
              }),
            },
            tokenPricing: {
              selectPriceHistory$: cold('a', { a: {} }),
            },
            network: {
              selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
            },
          },
          dependencies: {
            tokenPricingProvider: createMockProvider(),
            actions: tokenPricingActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
        }),
      );

      // Test 3: On testnet
      testSideEffect(
        fetchPriceHistoryOnDemand,
        ({ cold, expectObservable }) => ({
          actionObservables: {
            tokenPricing: {
              requestPriceHistory$: cold('a', {
                a: tokenPricingActions.tokenPricing.requestPriceHistory({
                  timeRange: '7D',
                }),
              }),
            },
          },
          stateObservables: {
            tokens: {
              selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
                a: [token],
              }),
            },
            tokenPricing: {
              selectPriceHistory$: cold('a', { a: {} }),
            },
            network: {
              selectNetworkType$: cold<NetworkType>('a', { a: 'testnet' }),
            },
          },
          dependencies: {
            tokenPricingProvider: createMockProvider(),
            actions: tokenPricingActions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
        }),
      );
    });

    it('should fetch price history for different time ranges and filter Cardano tokens only', () => {
      const cardanoToken1 = createMockToken('ada');
      const cardanoToken2 = createMockToken('min');
      const nonCardanoToken: Token = {
        ...createMockToken('eth'),
        blockchainName: 'Bitcoin',
      };
      const timeRanges = ['24H', '7D', '1M', '1Y'] as const;

      timeRanges.forEach(timeRange => {
        const responses = [
          createMockPriceHistoryResponse('ada', timeRange),
          createMockPriceHistoryResponse('min', timeRange),
        ];

        testSideEffect(
          fetchPriceHistoryOnDemand,
          ({ cold, expectObservable }) => {
            const mockProvider = createMockProvider(
              undefined,
              cold('a|', { a: responses }),
            );

            return {
              actionObservables: {
                tokenPricing: {
                  requestPriceHistory$: cold('a', {
                    a: tokenPricingActions.tokenPricing.requestPriceHistory({
                      timeRange,
                    }),
                  }),
                },
              },
              stateObservables: {
                tokens: {
                  selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
                    a: [cardanoToken1, cardanoToken2, nonCardanoToken],
                  }),
                },
                tokenPricing: {
                  selectPriceHistory$: cold('a', { a: {} }),
                },
                network: {
                  selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
                },
              },
              dependencies: {
                tokenPricingProvider: mockProvider,
                actions: tokenPricingActions,
                logger,
              },
              assertion: sideEffect$ => {
                expectObservable(sideEffect$).toBe('(ab)', {
                  a: expect.objectContaining({
                    type: 'tokenPricing/setPriceHistory',
                    payload: expect.objectContaining({
                      priceId: CardanoTokenPriceId(TokenId('ada')),
                      timeRange,
                    }),
                  }),
                  b: expect.objectContaining({
                    type: 'tokenPricing/setPriceHistory',
                    payload: expect.objectContaining({
                      priceId: CardanoTokenPriceId(TokenId('min')),
                      timeRange,
                    }),
                  }),
                });
              },
            };
          },
        );
      });
    });

    it('should respect TTL and skip fresh price history', () => {
      const token = createMockToken('ada');
      const priceId = CardanoTokenPriceId(TokenId('ada'));
      const timeRange = '7D';
      const recentTimestamp = Date.now() - 30000; // 30 seconds ago (within TTL)

      const existingPriceHistory = {
        [priceId]: {
          '24H': [],
          '7D': createMockPriceHistoryResponse('ada', timeRange).data,
          '1M': [],
          '1Y': [],
          lastFetched: {
            '24H': 0,
            '7D': recentTimestamp,
            '1M': 0,
            '1Y': 0,
          },
        },
      };

      testSideEffect(
        fetchPriceHistoryOnDemand,
        ({ cold, expectObservable }) => {
          const mockProvider = createMockProvider();

          return {
            actionObservables: {
              tokenPricing: {
                requestPriceHistory$: cold('a', {
                  a: tokenPricingActions.tokenPricing.requestPriceHistory({
                    timeRange,
                  }),
                }),
              },
            },
            stateObservables: {
              tokens: {
                selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
                  a: [token],
                }),
              },
              tokenPricing: {
                selectPriceHistory$: cold('a', { a: existingPriceHistory }),
              },
              network: {
                selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
              },
            },
            dependencies: {
              tokenPricingProvider: mockProvider,
              actions: tokenPricingActions,
              logger,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('');

              // Verify fetchPriceHistory was never called
              setTimeout(() => {
                expect(mockProvider.fetchPriceHistory).not.toHaveBeenCalled();
              }, 10);
            },
          };
        },
      );
    });

    it('should handle errors gracefully', () => {
      const token = createMockToken('ada');
      const timeRange = '1Y';
      const error = new Error('Network error');

      testSideEffect(
        fetchPriceHistoryOnDemand,
        ({ cold, expectObservable }) => {
          const mockProvider = createMockProvider(
            undefined,
            cold('#', {}, error),
          );
          const logErrorSpy = vi.spyOn(logger, 'error');

          return {
            actionObservables: {
              tokenPricing: {
                requestPriceHistory$: cold('a', {
                  a: tokenPricingActions.tokenPricing.requestPriceHistory({
                    timeRange,
                  }),
                }),
              },
            },
            stateObservables: {
              tokens: {
                selectAggregatedFungibleTokensForVisibleAccounts$: cold('a', {
                  a: [token],
                }),
              },
              tokenPricing: {
                selectPriceHistory$: cold('a', { a: {} }),
              },
              network: {
                selectNetworkType$: cold<NetworkType>('a', { a: 'mainnet' }),
              },
            },
            dependencies: {
              tokenPricingProvider: mockProvider,
              actions: tokenPricingActions,
              logger,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('');

              // Verify error was logged
              setTimeout(() => {
                expect(logErrorSpy).toHaveBeenCalledWith(
                  'Failed to fetch price history:',
                  error,
                );
              }, 10);
            },
          };
        },
      );
    });
  });
});
