import { Wallet } from '@lace/cardano';
import { BehaviorSubject, Observable } from 'rxjs';
import { currencyCode } from '@providers/currency/constants';

export interface TokenPrice {
  priceInAda: number;
  priceVariationPercentage24h: number;
}
export type MaybeTokenPrice = { lastFetchTime: number; price?: TokenPrice };
export type TokenPrices = Map<Wallet.Cardano.AssetId, MaybeTokenPrice>;

export type ADAPricesKeys = currencyCode | `${currencyCode}_24h_change`;
export type ADAPrices = Record<ADAPricesKeys, number>;

export type StatusTypes = 'idle' | 'fetching' | 'fetched' | 'error';
export interface Status {
  status: StatusTypes;
  timestamp?: number;
}

export type CoinPrices = {
  bitcoinPrices$: BehaviorSubject<{ prices: Partial<ADAPrices> } & Status>;
  adaPrices$: BehaviorSubject<{ prices: Partial<ADAPrices> } & Status>;
  tokenPrices$: Observable<{ tokens: TokenPrices } & Status>;
};
