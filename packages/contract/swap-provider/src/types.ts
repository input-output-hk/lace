import type { TranslationKey } from '@lace-contract/i18n';
import type { Result } from '@lace-lib/util';
import type { Observable } from 'rxjs';

// --- Error model ---

/** Why a swap provider call failed. */
export type SwapErrorCode =
  | 'INSUFFICIENT_LIQUIDITY'
  | 'PROVIDER_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNKNOWN'
  | 'UNSUPPORTED_PAIR'
  | 'VALIDATION';

/** A failed swap provider call: its code and the provider's message. */
export type SwapProviderError = {
  code: SwapErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

// --- Token and DEX ---

/** A token a swap provider can trade. */
export type SwapToken = {
  id: string;
  ticker: string;
  name: string;
  decimals: number;
  policyId?: string;
  icon?: string;
};

/** A DEX a swap provider routes through. */
export type SwapDex = {
  id: string;
  name: string;
};

// --- Quote ---

/** What to quote: the tokens, the amount sold, the slippage and the DEXes to leave out. */
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

/** One leg of a quote's route: the DEX and the share of the amount it takes. */
export type SwapRouteLeg = {
  dexName: string;
  sellTokenId: string;
  buyTokenId: string;
  percentage: number;
};

export type SwapDeposit = {
  /**
   * Lovelace, smallest-unit integer string. Refunded when the order settles,
   * but the account must hold it up front — the funds pre-check needs the raw
   * value, not just the formatted one.
   */
  amount: string;
  displayAmount: string;
  displayCurrency: string;
};

/**
 * A provider's quote for a swap: the expected amount bought, the price, the
 * fees, any refundable deposit, the route and when the quote expires.
 */
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
  deposit?: SwapDeposit;
  route: SwapRouteLeg[];
  quoteExpiresAt: number;
};

/** A fee a quote charges, with its amount for display. */
export type SwapFee = {
  label: TranslationKey;
  amount: string;
  tokenId: string;
  displayAmount: string;
  displayCurrency: string;
};

// --- Build ---

/** What to build a swap transaction from: a quote and the account's UTxOs and address. */
export type SwapBuildRequest = {
  quote: SwapQuote;
  slippage: number;
  userAddress: string;
  utxos: string[];
  collateralUtxos: string[];
  ttl: number;
};

/** An unsigned swap transaction, as CBOR hex, for the wallet to sign and submit. */
export type SwapTransaction = {
  unsignedTxCbor: string;
  providerId: string;
};

// --- Provider interface ---

/**
 * A provider-neutral swap interface: quotes, transaction builds, and the
 * tokens and DEXes a provider serves. Every call emits one `Result`.
 */
export interface SwapProvider {
  /** Quotes a swap. */
  getQuote(
    request: SwapQuoteRequest,
  ): Observable<Result<SwapQuote, SwapProviderError>>;

  /** Builds the unsigned transaction for a quote. */
  buildSwapTx(
    request: SwapBuildRequest,
  ): Observable<Result<SwapTransaction, SwapProviderError>>;

  /** The tokens the provider trades on a network. */
  listTokens(
    networkId: string,
  ): Observable<Result<SwapToken[], SwapProviderError>>;

  /** The DEXes the provider routes through on a network. */
  listDexes(
    networkId: string,
  ): Observable<Result<SwapDex[], SwapProviderError>>;

  /** Tokens matching a search query on a network. */
  searchTokens(
    networkId: string,
    query: string,
  ): Observable<Result<SwapToken[], SwapProviderError>>;
}

// --- Dependencies shape ---

export type SwapProviderDependencies = {
  swapProviders: SwapProvider[];
};
