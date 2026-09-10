/**
 * Whether a formatted reward amount is greater than zero.
 *
 * @param earnedCoin A locale-formatted amount, as produced by the formatters
 * in `@lace-lib/util-render`. Those emit ASCII digits in every locale and
 * rewards are never negative, so a nonzero digit is exactly the condition.
 * Deciding it without parsing means no separator can be misread.
 */
export const getEarnedRewards = (earnedCoin: string): boolean =>
  /[1-9]/.test(earnedCoin);
