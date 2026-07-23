import type { TokenPriceId } from './value-objects';
import type { Token } from '@lace-contract/tokens';
import type { BlockchainAssigned, BlockchainName } from '@lace-lib/util-store';

export type TimeRange = '1M' | '1Y' | '7D' | '24H';

export type PriceDataPoint = {
  timestamp: number;
  price: number;
  date: string;
};

/**
 * Token ID mapper for a specific blockchain.
 * Each blockchain module provides its own implementation via the addon pattern.
 */
export type TokenIdMapper = BlockchainAssigned<{
  getTokenPriceId: (token: Token) => TokenPriceId;
  getTokenPriceRequest: (
    token: Token,
    fiatCurrency: string,
  ) => TokenPriceRequest;
}>;

export type BaseTokenPrice = {
  priceId: TokenPriceId;
  blockchain: BlockchainName;
  identifier: string;
  fiatCurrency: string;
};

export type TokenPriceRequest = BaseTokenPrice & {
  /**
   * Unique on-chain asset identifier that disambiguates tokens sharing a ticker:
   * the provider matches it against its per-asset contract addresses (e.g.
   * CoinGecko `platforms`). For Cardano this is the `AssetId` (policyId +
   * assetName hex); undefined for chain-native coins (ADA, BTC), which have none.
   */
  contractAddress?: string;
};

export type TokenPriceResponse = BaseTokenPrice & {
  price: number;
  priceInUsd: number;
  change24h?: number;
};

export type TokenPrice = TokenPriceResponse & {
  lastUpdated: number;
  isStale?: boolean;
};

export interface PricingError {
  message: string;
  timestamp: number;
  retryAfter?: number;
}

export interface PricingMetadata {
  lastSuccessfulUpdate: number | null;
  isUpdating: boolean;
  error: PricingError | null;
  failedTokenIds: TokenPriceId[];
}

export interface TokenPriceHistoryResponse {
  priceId: TokenPriceId;
  timeRange: TimeRange;
  data: PriceDataPoint[];
}

export interface TokenPriceHistory {
  '24H': PriceDataPoint[];
  '7D': PriceDataPoint[];
  '1M': PriceDataPoint[];
  '1Y': PriceDataPoint[];
  lastFetched: {
    '24H': number;
    '7D': number;
    '1M': number;
    '1Y': number;
  };
}

export type CurrencyPreference = {
  name: string;
  ticker: string;
};

export interface TokenPricingState {
  prices: Record<TokenPriceId, TokenPrice>;
  priceHistory: Record<TokenPriceId, TokenPriceHistory>;
  metadata: PricingMetadata;
  currencyPreference: CurrencyPreference;
  /** Lowercase currency codes supported by CoinGecko. null = not yet fetched. */
  supportedVsCurrencies: string[] | null;
  /**
   * Lowercase currency codes to hide even if CoinGecko still supports them,
   * synced from the SUPPORTED_CURRENCIES feature flag payload. Not persisted;
   * re-synced from the flag on load.
   */
  currencyChoiceExclusions: string[];
}
