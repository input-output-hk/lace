import { CardanoTokenPriceId } from '@lace-contract/token-pricing';
import BigNumberJs from 'bignumber.js';

/**
 * Selected-currency price for a priced token, read the way the send flow
 * prices its fee rows (`computeFiatForFee`): gated only on a positive price.
 * Deliberately no freshness or fiat-currency-match guards — those left the
 * RealFi fee rows without the fiat line the rest of the app shows for the
 * same feed state (LW-14681).
 */
export const priceInCurrencyFrom = (
  prices: Partial<Record<string, { price: number }>> | undefined,
  priceId: string | null | undefined,
): number | undefined => {
  const price = priceId ? prices?.[priceId]?.price : undefined;
  return price !== undefined && price > 0 ? price : undefined;
};

/** ADA price per whole ADA in the selected display currency — the fixed
 * lovelace price entry, independent of the account's token list. */
export const adaPriceInCurrencyFrom = (
  prices: Partial<Record<string, { price: number }>> | undefined,
): number | undefined =>
  priceInCurrencyFrom(prices, CardanoTokenPriceId('lovelace'));

/**
 * Selected-currency price used to value a RealFi service fee's token. The fee is
 * charged in ADA (lovelace — valued via the ADA rate on the `isLovelace` path,
 * so undefined here) or a $1-pegged stablecoin (USDr or a curated counterpart
 * like USDCx / USDM). For a stablecoin, prefer the token-pricing feed when it
 * lists the token, else fall back to the USD→currency peg: the preprod
 * counterpart test stablecoins are absent from the feed, and without the peg
 * the whole estimated-fee row dashed even though the fee is a known $1-stable
 * amount.
 */
export const serviceFeePriceInCurrency = ({
  serviceFeeTokenId,
  lovelaceTokenId,
  usdrTokenId,
  usdToCurrencyRate,
  feedPriceInCurrency,
}: {
  serviceFeeTokenId: string | undefined;
  lovelaceTokenId: string;
  usdrTokenId: string | undefined;
  usdToCurrencyRate: number | undefined;
  /** `priceInCurrencyFrom(prices, …)` for the token, resolved by the caller. */
  feedPriceInCurrency: number | undefined;
}): number | undefined => {
  if (
    serviceFeeTokenId === undefined ||
    serviceFeeTokenId === lovelaceTokenId
  ) {
    return undefined;
  }
  if (serviceFeeTokenId === usdrTokenId) return usdToCurrencyRate;
  return feedPriceInCurrency ?? usdToCurrencyRate;
};

export type FeeAmount = {
  /** Fee in the charged denomination's base units. */
  baseUnits: string;
  /** True when the fee is already lovelace (network fee, ADA-input service fee). */
  isLovelace: boolean;
  /** Base-unit decimals of the charged denomination. */
  decimals: number;
};

export type FeeRates = {
  /** Fresh ADA price in the selected display currency; undefined when unpriced/stale. */
  adaPriceInCurrency: number | undefined;
  /** Fresh selected-currency price per display unit of the fee's token; undefined when unpriced/stale. */
  feeTokenPriceInCurrency: number | undefined;
};

/**
 * A quoted fee expressed as its charged-denomination `units` plus ADA +
 * selected-currency fiat (LW-14680 fee AC). The service fee is charged in the
 * swap-input token (stake) or USDr (unstake), so a non-lovelace fee converts
 * token → fiat → ADA via live prices. `units` needs no rate and is always
 * known; an undefined converted part means no fresh rate exists — the caller
 * renders an honest fallback instead of a fabricated number.
 */
export const convertFeeToAdaAndFiat = (
  amount: FeeAmount,
  rates: FeeRates,
): { units: number; ada: number | undefined; fiat: number | undefined } => {
  // BigNumber division like the send flow's computeFiatForFee — float
  // `Number/10**n` drifts on large base-unit strings, and the fee rows must
  // agree with the app's other money math to the displayed digit.
  const units = new BigNumberJs(amount.baseUnits)
    .dividedBy(new BigNumberJs(10).pow(amount.decimals))
    .toNumber();
  if (amount.isLovelace) {
    return {
      units,
      ada: units,
      fiat:
        rates.adaPriceInCurrency === undefined
          ? undefined
          : units * rates.adaPriceInCurrency,
    };
  }
  const fiat =
    rates.feeTokenPriceInCurrency === undefined
      ? undefined
      : units * rates.feeTokenPriceInCurrency;
  const ada =
    fiat !== undefined &&
    rates.adaPriceInCurrency !== undefined &&
    rates.adaPriceInCurrency > 0
      ? fiat / rates.adaPriceInCurrency
      : undefined;
  return { units, ada, fiat };
};
