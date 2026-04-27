import type { Result } from '@lace-sdk/util';
import type { Observable } from 'rxjs';

// --- Error model ---

export type SwapErrorCode =
  | 'INSUFFICIENT_LIQUIDITY'
  | 'PROVIDER_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNKNOWN'
  | 'UNSUPPORTED_PAIR'
  | 'VALIDATION';

export type SwapProviderError = {
  code: SwapErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

// --- Token and DEX ---

export type SwapToken = {
  id: string;
  ticker: string;
  name: string;
  decimals: number;
  policyId?: string;
  icon?: string;
};

export type SwapDex = {
  id: string;
  name: string;
};

// --- Quote ---

export type SwapQuoteRequest = {
  networkId: string;
  sellTokenId: string;
  sellTokenDecimals: number;
  buyTokenId: string;
  sellAmount: string;
  slippage: number;
  excludedDexes: string[];
  userAddress: string;
};

export type SwapRouteLeg = {
  dexName: string;
  sellTokenId: string;
  buyTokenId: string;
  percentage: number;
};

export type SwapQuote = {
  routeId: string;
  providerId: string;
  sellTokenId: string;
  buyTokenId: string;
  sellAmount: string;
  expectedBuyAmount: string;
  price: number;
  priceDisplay: string;
  fees: SwapFee[];
  totalFeeDisplay: string;
  route: SwapRouteLeg[];
  quoteExpiresAt: number;
};

export type SwapFee = {
  label: string;
  amount: string;
  tokenId: string;
  displayAmount: string;
  displayCurrency: string;
};

// --- Build ---

export type SwapBuildRequest = {
  quote: SwapQuote;
  slippage: number;
  userAddress: string;
  utxos: string[];
  collateralUtxos: string[];
  ttl: number;
};

export type SwapTransaction = {
  unsignedTxCbor: string;
  providerId: string;
};

// --- Provider interface ---

export interface SwapProvider {
  getQuote(
    request: SwapQuoteRequest,
  ): Observable<Result<SwapQuote, SwapProviderError>>;

  buildSwapTx(
    request: SwapBuildRequest,
  ): Observable<Result<SwapTransaction, SwapProviderError>>;

  listTokens(
    networkId: string,
  ): Observable<Result<SwapToken[], SwapProviderError>>;

  listDexes(
    networkId: string,
  ): Observable<Result<SwapDex[], SwapProviderError>>;

  searchTokens(
    networkId: string,
    query: string,
  ): Observable<Result<SwapToken[], SwapProviderError>>;
}

// --- Dependencies shape ---

export type SwapProviderDependencies = {
  swapProviders: SwapProvider[];
};
