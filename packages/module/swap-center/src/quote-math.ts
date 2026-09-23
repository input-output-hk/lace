/** Quote arithmetic for the swap UI — pure, exact bigint maths. */
// The funds pre-check and the intent gate must reserve the SAME allowance: a
// pre-check that under-reserves sends the user to top up to an amount the gate
// still refuses. One constant, owned by the rule that enforces it.
import { SWAP_ADA_HEADROOM_LOVELACE } from '@lace-contract/swap-context';

import type { SwapQuote } from '@lace-contract/swap-provider';

export const LOVELACE_TOKEN_ID = 'lovelace';

/**
 * Lovelace cost a swap adds on top of the sold amount, from a live quote.
 * Includes the refundable deposit: refundable or not, the account has to hold
 * it when the transaction is built.
 */
export const swapAdaOverhead = (quote: SwapQuote): bigint => {
  const fees = quote.fees.reduce((total, fee) => {
    if (fee.tokenId !== LOVELACE_TOKEN_ID) return total;
    try {
      return total + BigInt(fee.amount);
    } catch {
      return total;
    }
  }, 0n);
  let deposit = 0n;
  try {
    deposit = quote.deposit ? BigInt(quote.deposit.amount) : 0n;
  } catch {
    deposit = 0n;
  }
  return fees + deposit + SWAP_ADA_HEADROOM_LOVELACE;
};

/**
 * Fallback overhead for the quick-amount buttons, which act BEFORE any quote
 * exists for the amount they are about to set. Mirrors the CSWAP ADA→token
 * quote observed in production (0.69 batcher + 1.00 service + 2.00 deposit).
 */
const FALLBACK_ADA_OVERHEAD_LOVELACE = 3_690_000n + SWAP_ADA_HEADROOM_LOVELACE;

/**
 * The largest amount of `sellTokenId` the account can actually commit. Selling
 * ADA has to leave the overhead behind; selling a token spends the whole
 * balance (its fees come out of the ADA side, checked separately).
 */
export const maxSellableBaseAmount = ({
  available,
  overhead,
  sellTokenId,
}: {
  available: bigint;
  overhead: bigint | undefined;
  sellTokenId: string;
}): bigint => {
  if (sellTokenId !== LOVELACE_TOKEN_ID) return available;
  const reserve = overhead ?? FALLBACK_ADA_OVERHEAD_LOVELACE;
  return available > reserve ? available - reserve : 0n;
};

/**
 * Total lovelace the account must hold to commit this swap: the overhead plus,
 * when ADA is what is being sold, the sold amount itself.
 *
 * The single source of the number both the gate and its message use — quoting a
 * smaller figure than the gate enforces would send the user to top up to an
 * amount that still gets rejected.
 */
export const requiredAdaForSwap = ({
  quote,
  sellAmountBase,
  sellTokenId,
}: {
  quote: SwapQuote;
  sellAmountBase: bigint;
  sellTokenId: string;
}): bigint =>
  swapAdaOverhead(quote) +
  (sellTokenId === LOVELACE_TOKEN_ID ? sellAmountBase : 0n);

/**
 * Whether the account can cover the swap. Two independent constraints: the
 * sold token's own balance, and — once a quote is known — the ADA side, which
 * pays the fees and the deposit even when the sold token is not ADA.
 */
export const isSwapUnderfunded = ({
  adaAvailable,
  quote,
  sellAmountBase,
  sellTokenAvailable,
  sellTokenId,
}: {
  adaAvailable: bigint | undefined;
  quote: SwapQuote | undefined;
  sellAmountBase: bigint;
  sellTokenAvailable: bigint;
  sellTokenId: string;
}): boolean => {
  if (sellAmountBase <= 0n) return false;
  if (sellAmountBase > sellTokenAvailable) return true;
  if (!quote || adaAvailable === undefined) return false;
  return (
    requiredAdaForSwap({ quote, sellAmountBase, sellTokenId }) > adaAvailable
  );
};

/** Lovelace → ADA at the 2 decimals the fee rows already use. */
export const formatLovelaceAsAda = (lovelace: bigint): string =>
  (Number(lovelace) / 1_000_000).toFixed(2);

/**
 * Sold token paid per 1 unit of bought token, in DISPLAY units, including
 * every fee charged in the sold token.
 *
 * Not the provider's `price`, which counts only the batcher fee — it read
 * 0.121716 ADA/NIGHT for a swap that really cost 0.1431 once the 1 ADA service
 * fee is counted. Also decimals-correct: `price` is a ratio of smallest units,
 * so it is off by 10^(buyDecimals − sellDecimals) for any pair whose sides
 * differ. The refundable deposit is excluded — it comes back.
 */
export const effectiveSellPerBuy = ({
  buyDecimals,
  quote,
  sellDecimals,
}: {
  buyDecimals: number | undefined;
  quote: SwapQuote;
  sellDecimals: number | undefined;
}): number | undefined => {
  if (buyDecimals === undefined || sellDecimals === undefined) return undefined;
  let sellBase: bigint;
  let buyBase: bigint;
  try {
    sellBase = BigInt(quote.sellAmount);
    buyBase = BigInt(quote.expectedBuyAmount);
  } catch {
    return undefined;
  }
  if (buyBase <= 0n) return undefined;
  const feesInSellToken = quote.fees.reduce((total, fee) => {
    if (fee.tokenId !== quote.sellTokenId) return total;
    try {
      return total + BigInt(fee.amount);
    } catch {
      return total;
    }
  }, 0n);
  const sellDisplay = Number(sellBase + feesInSellToken) / 10 ** sellDecimals;
  const buyDisplay = Number(buyBase) / 10 ** buyDecimals;
  if (!Number.isFinite(sellDisplay) || buyDisplay === 0) return undefined;
  return sellDisplay / buyDisplay;
};

/** `effectiveSellPerBuy` rendered at the 6 decimals the flow uses elsewhere. */
export const formatSellPerBuy = (
  rate: number | undefined,
): string | undefined => (rate === undefined ? undefined : rate.toFixed(6));
