import type {
  TimeRange,
  TokenPriceHistoryResponse,
  TokenPriceRequest,
  TokenPriceResponse,
} from '../types';
import type { Observable } from 'rxjs';

export interface TokenPricingProvider {
  fetchPrices(requests: TokenPriceRequest[]): Observable<TokenPriceResponse[]>;
  fetchPriceHistory(
    requests: TokenPriceRequest[],
    timeRange: TimeRange,
  ): Observable<TokenPriceHistoryResponse[]>;
}

export interface TokenPricingProviderDependency {
  tokenPricingProvider: TokenPricingProvider;
}
