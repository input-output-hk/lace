import { ADA_DECIMALS } from '@lace-contract/cardano-context';
import { formatAmountToLocale } from '@lace-lib/util-render';

/**
 * What actually lands in the destination. Clamped at zero — an estimate above
 * the balance is a sweep that cannot build, which the empty-discovery guard
 * already refuses.
 */
export const netReceived = (
  totalCoin: string | undefined,
  withdrawableRewards: string | undefined,
  estimatedFee: string | undefined,
): string => {
  const net =
    BigInt(totalCoin || '0') +
    BigInt(withdrawableRewards || '0') -
    BigInt(estimatedFee || '0');
  return (net > 0n ? net : 0n).toString();
};

/**
 * Format a lovelace integer string as ADA, through the same platform formatter
 * the token rows in this card already use.
 *
 * Not hand-rolled: grouping the whole part with `toLocaleString()` and then
 * joining the fraction with a literal `.` makes both marks the same glyph
 * wherever the locale groups on `.`, so `1.234,567` rendered as `1.234.567` and
 * read as 1000× the real amount — on the headline figure of a one-way sweep.
 * `formatAmountToLocale` carries the value in BigNumber throughout, so amounts
 * past Number.MAX_SAFE_INTEGER keep full precision as before.
 */
export const formatAda = (
  lovelace: string | undefined,
  ticker: string,
): string => `${formatAmountToLocale(lovelace || '0', ADA_DECIMALS)} ${ticker}`;

/**
 * Signs an amount, so a column of them reads as the sum behind the headline
 * figure rather than four unrelated balances. Zero stays unsigned: "+ 0" makes
 * a term of the sum out of something that did not happen.
 */
export const formatAdaSigned = (
  lovelace: string | undefined,
  ticker: string,
  sign: '+' | '−',
): string => {
  const formatted = formatAda(lovelace, ticker);
  return BigInt(lovelace || '0') === 0n ? formatted : `${sign} ${formatted}`;
};
