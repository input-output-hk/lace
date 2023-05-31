import { Wallet } from '@lace/cardano';
import { BehaviorSubject } from 'rxjs';
import { currencyCode } from '@providers/currency/constants';

export interface TokenPrice {
  id: string;
  priceInAda: number;
  priceVariationPercentage24h: number;
}
export type TokenPrices = Map<Wallet.Cardano.AssetId, TokenPrice>;

export type ADAPricesKeys = currencyCode | `${currencyCode}_24h_change`;
export type ADAPrices = Record<ADAPricesKeys, number>;

export type StatusTypes = 'idle' | 'fetching' | 'fetched' | 'error';
export interface Status {
  status: StatusTypes;
  timestamp?: number;
}

export type CoinPrices = {
  adaPrices$: BehaviorSubject<{ prices: Partial<ADAPrices> } & Status>;
  tokenPrices$: BehaviorSubject<{ tokens: TokenPrices } & Status>;
};
