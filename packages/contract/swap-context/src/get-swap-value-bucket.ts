import {
  ADA_DECIMALS,
  LOVELACE_TOKEN_ID,
} from '@lace-contract/cardano-context';
import {
  CardanoTokenPriceId,
  bucketUsdValue,
  getTokenPriceId,
  priceAmountInUsd,
} from '@lace-contract/token-pricing';
import { BigNumber } from '@lace-lib/util';

import type { SwapQuote } from '@lace-contract/swap-provider';
import type {
  TokenPrice,
  TokenPriceId,
  TransferValueBucket,
} from '@lace-contract/token-pricing';
import type { Token } from '@lace-contract/tokens';

/**
 * A provider amount as a positive bigint, or `undefined` when it is unusable.
 *
 * `BigInt('')` is 0n rather than a throw, so an absent amount arrives here as a
 * value rather than an exception; a non-positive amount is not a real trade and
 * bucketing it would report the smallest bucket for absent data.
 */
const positiveAmount = (raw: string): bigint | undefined => {
  let amount: bigint;
  try {
    amount = BigInt(raw);
  } catch {
    return undefined;
  }
  return amount > 0n ? amount : undefined;
};

/** `undefined` for a token-to-token trade, which has no ADA leg to measure. */
const adaLegLovelace = (quote: SwapQuote): string | undefined => {
  if (quote.sellTokenId === LOVELACE_TOKEN_ID) return quote.sellAmount;
  // Expected, not settled: the order fills after submission, so at sign time
  // no realised output amount exists.
  if (quote.buyTokenId === LOVELACE_TOKEN_ID) return quote.expectedBuyAmount;
  return undefined;
};

/**
 * The value properties of a `swaps | sign success` payload, ready to spread.
 *
 * `swapValueAda` is the size to sum and `swapValue` its bucket. A trade with
 * nothing measurable carries neither, so an absent bucket always means an
 * unvalued trade — but the converse does not hold: a bucket can be reported
 * without a size, because the two need different prices to compute.
 * `swapValueSource` says which leg produced the size: an ADA leg is exact and
 * price-free, a priced token-to-token trade is a CoinGecko estimate, and a
 * dashboard must not sum the two blind.
 */
export type SwapValueAnalytics = {
  swapValue?: TransferValueBucket;
  swapValueAda?: number;
  swapValueSource?: 'ada-leg' | 'priced';
};

const bucketOrUnknown = (usd: number | undefined): TransferValueBucket =>
  usd === undefined ? 'UNKNOWN' : bucketUsdValue(usd);

/**
 * USD value of one ADA, or `undefined` when ADA is unpriced.
 *
 * Goes through `priceAmountInUsd` rather than reading the cache directly so the
 * rate inherits the same missing / stale / non-positive rejections as any other
 * priced amount.
 */
const adaUsdRate = (
  prices: Record<TokenPriceId, TokenPrice>,
): number | undefined =>
  priceAmountInUsd({
    amount: BigNumber(BigInt(10 ** ADA_DECIMALS)),
    decimals: ADA_DECIMALS,
    priceId: CardanoTokenPriceId(LOVELACE_TOKEN_ID),
    prices,
  });

/**
 * Value a swap for analytics, from its own ADA leg where it has one and through
 * the sell token's price where it does not.
 *
 * An ADA-leg trade never takes the priced path, so no trade is counted twice.
 *
 * `'UNKNOWN'` is reserved for an ADA leg that exists but cannot be read. A
 * token-to-token trade left unvalued for any reason — an unheld, unpriced,
 * undecimalled or unreadable sell token — yields an empty fragment instead,
 * never `'UNKNOWN'`. So a dashboard counting `'UNKNOWN'` sees ADA-leg read
 * failures only, not every unvalued trade.
 */
export const getSwapValueAnalytics = (
  quote: SwapQuote,
  sellToken: Token | undefined,
  prices: Record<TokenPriceId, TokenPrice>,
): SwapValueAnalytics => {
  const lovelace = adaLegLovelace(quote);
  if (lovelace !== undefined) {
    const lovelaceAmount = positiveAmount(lovelace);
    // A leg that exists but is unreadable is unvalued, not zero-valued: the
    // bucket says so while the summable figure stays absent.
    if (lovelaceAmount === undefined) return { swapValue: 'UNKNOWN' };
    return {
      swapValue: bucketOrUnknown(
        priceAmountInUsd({
          amount: BigNumber(lovelaceAmount),
          decimals: ADA_DECIMALS,
          priceId: CardanoTokenPriceId(LOVELACE_TOKEN_ID),
          prices,
        }),
      ),
      swapValueAda: Number(lovelaceAmount) / 10 ** ADA_DECIMALS,
      swapValueSource: 'ada-leg',
    };
  }

  if (!sellToken) return {};
  // Only excludes a never-fetched token: `decimals` falls back to 0 in the
  // layers below, so a registry-pending token still arrives with metadata and
  // is valued 10^decimals too high until the tokens layer can express "unknown".
  if (!sellToken.metadata) return {};
  const priceId = getTokenPriceId(sellToken);
  if (priceId === null) return {};

  const sellAmount = positiveAmount(quote.sellAmount);
  if (sellAmount === undefined) return {};

  const sellUsd = priceAmountInUsd({
    amount: BigNumber(sellAmount),
    decimals: sellToken.decimals,
    priceId,
    prices,
  });
  if (sellUsd === undefined) return {};

  const adaUsd = adaUsdRate(prices);
  return {
    swapValue: bucketUsdValue(sellUsd),
    // The USD figure is reportable without the rate, but the ADA one is not:
    // omitting only the size keeps the bucket's coverage from shrinking during
    // an ADA-price outage.
    ...(adaUsd !== undefined && {
      swapValueAda: sellUsd / adaUsd,
      swapValueSource: 'priced' as const,
    }),
  };
};
