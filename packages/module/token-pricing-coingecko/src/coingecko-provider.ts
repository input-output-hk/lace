import { DEFAULT_CURRENCY } from '@lace-contract/token-pricing';
import { catchError, from, map, of, switchMap, tap } from 'rxjs';

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

export class CoinGeckoProvider implements TokenPricingProvider {
  private coinsListCache?: CoinGeckoCoinsList;

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

  private async ensureCoinsListLoaded(): Promise<CoinGeckoCoinsList> {
    if (!this.coinsListCache) {
      this.coinsListCache = await coingeckoClient.fetchCoinsList(this.baseUrl);
    }
    return this.coinsListCache;
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
            request.identifier,
            request.blockchain,
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
