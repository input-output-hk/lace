import { formatLocaleNumber } from '@lace-lib/util-render';

import type { RealFiYieldEarned } from '@lace-contract/realfi-staking';

const FIAT_DECIMALS = 2;
const SMALL_YIELD_SIGNIFICANT_FIGURES = 2;
const ONE_CENT = 0.01;

/** Total RealFi-reported yield (USDr base units) across the given accounts. */
export const sumYieldEarnedBaseUnits = (
  accountIds: readonly string[],
  yieldEarnedByAccount: Readonly<Record<string, RealFiYieldEarned | undefined>>,
): bigint =>
  accountIds.reduce(
    (sum, accountId) =>
      sum + BigInt(yieldEarnedByAccount[accountId]?.yieldUsdrBaseUnits ?? '0'),
    0n,
  );

/**
 * Formats a yield-earned amount in the selected currency, truncating like
 * every other fiat amount in the app so earnings are never overstated. A cent
 * or more uses 2 decimals; a positive sub-cent yield (small positions) keeps
 * 2 significant figures so it doesn't read as "0.00" earned.
 */
export const formatYieldEarnedFiat = (amount: number): string => {
  if (amount <= 0 || amount >= ONE_CENT) {
    return formatLocaleNumber(String(amount), FIAT_DECIMALS);
  }
  const decimals =
    SMALL_YIELD_SIGNIFICANT_FIGURES - 1 - Math.floor(Math.log10(amount));
  return formatLocaleNumber(String(amount), decimals);
};
