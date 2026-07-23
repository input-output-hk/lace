import { DEFAULT_CURRENCY } from '@lace-contract/token-pricing';
import { catchError, defer, from, map, of, switchMap, tap } from 'rxjs';

import { coingeckoClient } from './coingecko-client';
import { findCoinGeckoId } from './utils';

import type { CoinGeckoCoinsList } from './types';
import type {
  TokenPriceHistoryResponse,
  TokenPriceRequest,
  TokenPriceResponse,
  TokenPricingProvider,
} from '@lace-contract/token-pricing';
import type { PriceDataPoint, TimeRange } from '@lace-lib/ui-toolkit';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

// The supported vs_currencies list is stable but can change; a TTL'd cache lets
// a currency CoinGecko later drops stop being offered within the window.
const SUPPORTED_CURRENCIES_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export class CoinGeckoProvider implements TokenPricingProvider {
  private coinsListCache?: CoinGeckoCoinsList;
  private coinsListPromise?: Promise<CoinGeckoCoinsList>;
  private supportedCurrenciesCache?: { value: string[]; fetchedAt: number };

  public constructor(
    private readonly baseUrl: string,
    public logger: Logger = console,
  ) {}

  public fetchPrices(
    requests: TokenPriceRequest[],
  ): Observable<TokenPriceResponse[]> {
    return this.getMappedRequests(requests).pipe(
      switchMap(({ mappedRequests, requestToCoinGeckoId }) => {
        if (mappedRequests.length === 0) {
          return of([]);
        }

        const coingeckoIds = Array.from(new Set(requestToCoinGeckoId.values()));
        const selectedCurrency =
          mappedRequests[0]?.fiatCurrency ?? DEFAULT_CURRENCY;

        return from(
          coingeckoClient.fetchTokenPrices(
            this.baseUrl,
            coingeckoIds,
            selectedCurrency,
          ),
        ).pipe(
          tap({
            error: error => {
              this.logger.error('CoinGecko fetch failed:', error);
            },
          }),
          map(priceMap => {
            const responses: TokenPriceResponse[] = [];

            for (const request of mappedRequests) {
              const cgId = requestToCoinGeckoId.get(request.priceId);
              const priceData = cgId ? priceMap.get(cgId) : undefined;

              if (priceData) {
                responses.push({
                  priceId: request.priceId,
                  blockchain: request.blockchain,
                  identifier: request.identifier,
                  price: priceData.price,
                  priceInUsd: priceData.priceInUsd ?? priceData.price,
                  fiatCurrency: request.fiatCurrency,
                  change24h: priceData.change24h,
                });
              }
            }

            return responses;
          }),
        );
      }),
    );
  }

  public fetchPriceHistory(
    requests: TokenPriceRequest[],
    timeRange: TimeRange = '24H',
  ): Observable<TokenPriceHistoryResponse[]> {
    return this.getMappedRequests(requests).pipe(
      switchMap(({ mappedRequests, requestToCoinGeckoId }) => {
        if (mappedRequests.length === 0) {
          return of([]);
        }

        const coinGeckoIds = Array.from(new Set(requestToCoinGeckoId.values()));
        const selectedCurrency =
          mappedRequests[0]?.fiatCurrency ?? DEFAULT_CURRENCY;
        return from(
          coingeckoClient.fetchPriceHistory({
            baseUrl: this.baseUrl,
            coinGeckoIds,
            currency: selectedCurrency,
            timeRange,
          }),
        ).pipe(
          tap({
            error: error => {
              this.logger.error(
                'CoinGecko price history batch fetch failed:',
                error,
              );
            },
          }),
          map(historyData => {
            const responses: TokenPriceHistoryResponse[] = [];

            if (historyData instanceof Map) {
              for (const request of mappedRequests) {
                const cgId = requestToCoinGeckoId.get(request.priceId);
                const data = cgId ? historyData.get(cgId) : undefined;

                responses.push({
                  priceId: request.priceId,
                  timeRange,
                  data: (data as PriceDataPoint[]) ?? [],
                });
              }
            }

            return responses;
          }),
          catchError(error => {
            this.logger.error(
              'CoinGecko price history batch processing failed:',
              error,
            );
            return of(
              mappedRequests.map(request => ({
                priceId: request.priceId,
                timeRange,
                data: [],
              })),
            );
          }),
        );
      }),
    );
  }

  public fetchSupportedCurrencies(): Observable<string[]> {
    const cached = this.supportedCurrenciesCache;
    if (
      cached &&
      Date.now() - cached.fetchedAt < SUPPORTED_CURRENCIES_CACHE_TTL_MS
    ) {
      return of(cached.value);
    }
    // `defer` so each retryBackoff resubscription issues a fresh request rather
    // than replaying one eagerly-created (already-settled) promise.
    return defer(() =>
      from(coingeckoClient.fetchSupportedCurrencies(this.baseUrl)),
    ).pipe(
      tap({
        next: currencies => {
          // Only cache a non-empty list — a transient empty response should be
          // retried, not pinned.
          if (currencies.length > 0) {
            this.supportedCurrenciesCache = {
              value: currencies,
              fetchedAt: Date.now(),
            };
          }
        },
        error: error => {
          this.logger.error(
            'CoinGecko fetchSupportedCurrencies failed:',
            error,
          );
        },
      }),
    );
  }

  private async ensureCoinsListLoaded(): Promise<CoinGeckoCoinsList> {
    if (this.coinsListCache) {
      return this.coinsListCache;
    }
    // Memoize the in-flight promise so concurrent callers (price + per-range
    // history fetches firing together) share a single coins-list download
    // instead of each racing on the empty cache and fetching it again.
    if (!this.coinsListPromise) {
      this.coinsListPromise = coingeckoClient
        .fetchCoinsList(this.baseUrl)
        .then(list => {
          this.coinsListCache = list;
          return list;
        })
        .catch(error => {
          // Don't cache a rejected fetch — let the next call retry.
          this.coinsListPromise = undefined;
          throw error;
        });
    }
    return this.coinsListPromise;
  }

  private getMappedRequests(requests: TokenPriceRequest[]): Observable<{
    mappedRequests: TokenPriceRequest[];
    requestToCoinGeckoId: Map<string, string>;
  }> {
    if (requests.length === 0) {
      return of({ mappedRequests: [], requestToCoinGeckoId: new Map() });
    }

    return from(this.ensureCoinsListLoaded()).pipe(
      map(coinsList => {
        const requestToCoinGeckoId = new Map<string, string>();
        const mappedRequests: TokenPriceRequest[] = [];

        for (const request of requests) {
          const cgId = findCoinGeckoId(
            {
              identifier: request.identifier,
              blockchain: request.blockchain,
              contractAddress: request.contractAddress,
            },
            coinsList,
          );
          if (cgId) {
            requestToCoinGeckoId.set(request.priceId, cgId);
            mappedRequests.push(request);
          }
        }

        return { mappedRequests, requestToCoinGeckoId };
      }),
    );
  }
}

export const createCoinGeckoProvider = (
  baseUrl: string,
): TokenPricingProvider => {
  return new CoinGeckoProvider(baseUrl);
};
