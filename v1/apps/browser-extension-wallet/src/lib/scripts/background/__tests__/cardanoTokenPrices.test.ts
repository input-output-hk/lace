/* eslint-disable no-magic-numbers */
import { Cardano } from '@cardano-sdk/core';
import { createTestScheduler } from '@cardano-sdk/util-dev';
import { trackTokenPrice } from '../services/cardanoTokenPrices';
import type { MaybeTokenPrice } from '../../types';
import { defer, take } from 'rxjs';

type PriceMap = Map<Cardano.AssetId, MaybeTokenPrice>;

describe('trackTokenPrice', () => {
  const assetId = 'asset123' as Cardano.AssetId;
  const TOKEN_PRICE_CHECK_INTERVAL = 300_000; // 5 minutes in ms

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when price fetch is due', () => {
    it('should fetch price immediately when no known price exists', () => {
      createTestScheduler().run(({ expectObservable, flush, cold }) => {
        const baseTime = 1_000_000;

        // Mock Date.now() to return a fixed base time
        jest.spyOn(Date, 'now').mockReturnValue(baseTime);

        const knownPrices$ = cold<PriceMap>('a', {
          a: new Map<Cardano.AssetId, MaybeTokenPrice>()
        });

        const mockFetchPrice = jest.fn((id: Cardano.AssetId) =>
          cold<[Cardano.AssetId, MaybeTokenPrice]>('(a|)', {
            a: [
              id,
              {
                lastFetchTime: baseTime,
                price: { priceInAda: 1.5, priceVariationPercentage24h: 2.5 }
              }
            ]
          })
        );

        const result$ = trackTokenPrice({
          assetId,
          knownPrices$,
          fetchPriceFn: mockFetchPrice
        }).pipe(take(1));

        expectObservable(result$).toBe('(a|)', {
          a: [
            assetId,
            {
              lastFetchTime: baseTime,
              price: { priceInAda: 1.5, priceVariationPercentage24h: 2.5 }
            }
          ]
        });

        flush();
        expect(mockFetchPrice).toHaveBeenCalledWith(assetId);
      });
    });

    it('should fetch price immediately when known price is past due', () => {
      createTestScheduler().run(({ expectObservable, flush, cold }) => {
        const baseTime = 1_000_000;
        const pastDueTime = baseTime - TOKEN_PRICE_CHECK_INTERVAL - 1000; // 1 second past due

        jest.spyOn(Date, 'now').mockReturnValue(baseTime);

        const knownPrice: MaybeTokenPrice = {
          lastFetchTime: pastDueTime,
          price: { priceInAda: 1, priceVariationPercentage24h: 1 }
        };

        const knownPrices$ = cold<PriceMap>('a', {
          a: new Map<Cardano.AssetId, MaybeTokenPrice>([[assetId, knownPrice]])
        });

        const mockFetchPrice = jest.fn((id: Cardano.AssetId) => {
          const result: [Cardano.AssetId, MaybeTokenPrice] = [
            id,
            {
              lastFetchTime: baseTime,
              price: { priceInAda: 1.5, priceVariationPercentage24h: 2.5 }
            }
          ];
          return cold<[Cardano.AssetId, MaybeTokenPrice]>('a', { a: result });
        });

        const result$ = trackTokenPrice({
          assetId,
          knownPrices$,
          fetchPriceFn: mockFetchPrice
        }).pipe(take(1));

        expectObservable(result$).toBe('(a|)', {
          a: [
            assetId,
            {
              lastFetchTime: baseTime,
              price: { priceInAda: 1.5, priceVariationPercentage24h: 2.5 }
            }
          ]
        });

        flush();
        expect(mockFetchPrice).toHaveBeenCalledWith(assetId);
      });
    });
  });

  describe('when price fetch is not yet due', () => {
    it('should wait until due time before fetching', () => {
      createTestScheduler().run(({ expectObservable, flush, cold }) => {
        const baseTime = 1_000_000;
        const waitTime = 5000; // 5 seconds until due
        const lastFetchTime = baseTime - TOKEN_PRICE_CHECK_INTERVAL + waitTime;

        // Mock Date.now() to return baseTime when checked
        jest.spyOn(Date, 'now').mockReturnValue(baseTime);

        const knownPrice: MaybeTokenPrice = {
          lastFetchTime,
          price: { priceInAda: 1, priceVariationPercentage24h: 1 }
        };

        const knownPrices$ = cold<PriceMap>('a', {
          a: new Map<Cardano.AssetId, MaybeTokenPrice>([[assetId, knownPrice]])
        });

        const mockFetchPrice = jest.fn((id: Cardano.AssetId) =>
          cold<[Cardano.AssetId, MaybeTokenPrice]>('(a|)', {
            a: [
              id,
              {
                lastFetchTime: baseTime + waitTime,
                price: { priceInAda: 1.5, priceVariationPercentage24h: 2.5 }
              }
            ]
          })
        );

        const result$ = trackTokenPrice({
          assetId,
          knownPrices$,
          fetchPriceFn: mockFetchPrice
        }).pipe(take(1));

        // Wait for waitTime (5000ms) before fetching
        // Marble syntax: 'a 5000ms b' means 'a' at frame 0, 'b' at frame 5004
        expectObservable(result$).toBe(`${waitTime}ms (a|)`, {
          a: [
            assetId,
            {
              lastFetchTime: baseTime + waitTime,
              price: { priceInAda: 1.5, priceVariationPercentage24h: 2.5 }
            }
          ]
        });

        flush();
        expect(mockFetchPrice).toHaveBeenCalledWith(assetId);
      });
    });
  });

  describe('price fetch repetition', () => {
    it('should repeat price fetch at TOKEN_PRICE_CHECK_INTERVAL', () => {
      createTestScheduler().run(({ expectObservable, flush, cold }) => {
        const baseTime = 1_000_000;
        let fetchCallCount = 0;

        jest.spyOn(Date, 'now').mockReturnValue(baseTime);

        const knownPrices$ = cold<PriceMap>('a', {
          a: new Map<Cardano.AssetId, MaybeTokenPrice>()
        });

        const mockFetchPrice = jest.fn((id: Cardano.AssetId) =>
          defer(() => {
            const callCount = fetchCallCount;
            fetchCallCount++;
            return cold<[Cardano.AssetId, MaybeTokenPrice]>('(a|)', {
              a: [
                id,
                {
                  lastFetchTime: baseTime + callCount * TOKEN_PRICE_CHECK_INTERVAL,
                  price: {
                    priceInAda: 1 + callCount * 0.1,
                    priceVariationPercentage24h: 1 + callCount * 0.1
                  }
                }
              ]
            });
          })
        );

        const result$ = trackTokenPrice({
          assetId,
          knownPrices$,
          fetchPriceFn: mockFetchPrice
        }).pipe(take(2));

        // First fetch immediately, then repeat after TOKEN_PRICE_CHECK_INTERVAL
        expectObservable(result$, '^ 300000ms !').toBe(`a ${TOKEN_PRICE_CHECK_INTERVAL - 1}ms (b|)`, {
          a: [
            assetId,
            expect.objectContaining({
              lastFetchTime: baseTime,
              price: expect.objectContaining({
                priceInAda: 1,
                priceVariationPercentage24h: 1
              })
            })
          ],
          b: [
            assetId,
            expect.objectContaining({
              lastFetchTime: baseTime + TOKEN_PRICE_CHECK_INTERVAL,
              price: expect.objectContaining({
                priceInAda: 1.1,
                priceVariationPercentage24h: 1.1
              })
            })
          ]
        });
        flush();
      });
    });

    it('should stop repeating when 404 (notFound) is returned', () => {
      createTestScheduler().run(({ expectObservable, flush, cold }) => {
        const baseTime = 1_000_000;

        jest.spyOn(Date, 'now').mockReturnValue(baseTime);

        const knownPrices$ = cold<PriceMap>('a', {
          a: new Map<Cardano.AssetId, MaybeTokenPrice>()
        });

        const mockFetchPrice = jest.fn((id: Cardano.AssetId) =>
          cold<[Cardano.AssetId, MaybeTokenPrice]>('(a|)', {
            a: [
              id,
              {
                lastFetchTime: baseTime,
                notFound: true
              }
            ]
          })
        );

        const result$ = trackTokenPrice({
          assetId,
          knownPrices$,
          fetchPriceFn: mockFetchPrice
        }).pipe(take(1));

        // Should emit once with notFound, then stop (takeWhile stops on notFound)
        expectObservable(result$, '^ 600000ms !').toBe('(a|)', {
          a: [
            assetId,
            {
              lastFetchTime: baseTime,
              notFound: true
            }
          ]
        });

        flush();
        expect(mockFetchPrice).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('filtering behavior', () => {
    it('should emit failed fetch only when no known price exists', () => {
      createTestScheduler().run(({ expectObservable, flush, cold }) => {
        const baseTime = 1_000_000;

        jest.spyOn(Date, 'now').mockReturnValue(baseTime);

        const knownPrices$ = cold<PriceMap>('a', {
          a: new Map<Cardano.AssetId, MaybeTokenPrice>()
        });

        const mockFetchPrice = jest.fn((id: Cardano.AssetId) =>
          cold<[Cardano.AssetId, MaybeTokenPrice]>('(a|)', {
            a: [
              id,
              {
                lastFetchTime: baseTime
                // No price - fetch failed
              }
            ]
          })
        );

        const result$ = trackTokenPrice({
          assetId,
          knownPrices$,
          fetchPriceFn: mockFetchPrice
        }).pipe(take(1));

        // Should emit the failed fetch since no known price exists
        expectObservable(result$).toBe('(a|)', {
          a: [
            assetId,
            {
              lastFetchTime: baseTime
            }
          ]
        });

        flush();
        expect(mockFetchPrice).toHaveBeenCalledWith(assetId);
      });
    });

    it('should not emit failed fetch when known price exists', () => {
      createTestScheduler().run(({ expectObservable, flush, cold }) => {
        const baseTime = 1_000_000;
        const pastDueTime = baseTime - TOKEN_PRICE_CHECK_INTERVAL - 1000;

        jest.spyOn(Date, 'now').mockReturnValue(baseTime);

        const knownPrice: MaybeTokenPrice = {
          lastFetchTime: pastDueTime,
          price: { priceInAda: 1, priceVariationPercentage24h: 1 }
        };

        const knownPrices$ = cold<PriceMap>('a', {
          a: new Map<Cardano.AssetId, MaybeTokenPrice>([[assetId, knownPrice]])
        });

        const mockFetchPrice = jest.fn((id: Cardano.AssetId) => {
          const result: [Cardano.AssetId, MaybeTokenPrice] = [
            id,
            {
              lastFetchTime: baseTime
              // No price - fetch failed, but we have known price
            }
          ];
          return cold<[Cardano.AssetId, MaybeTokenPrice]>('a', { a: result });
        });

        const result$ = trackTokenPrice({
          assetId,
          knownPrices$,
          fetchPriceFn: mockFetchPrice
        }).pipe(take(1));

        // Should not emit failed fetch since known price exists (filtered out)
        expectObservable(result$).toBe('-', {});

        flush();
        expect(mockFetchPrice).toHaveBeenCalledWith(assetId);
      });
    });
  });
});
