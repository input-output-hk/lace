import BigNumberJs from 'bignumber.js';

import { valueToLocale } from './format-number';

export type TokenPriceDisplayProps = {
  rate: string;
  conversion: string;
  isPriceStale?: boolean;
};

type GetTokenPriceDisplayPropsArgs = {
  available: string;
  decimals: number;
  price: number | string;
  isPriceStale?: boolean;
  rateFractionDigits?: number;
  conversionMinFractionDigits?: number;
  conversionMaxFractionDigits?: number;
};

export const getTokenPriceDisplayProps = ({
  available,
  decimals,
  price,
  isPriceStale,
  rateFractionDigits = 4,
  conversionMinFractionDigits = 2,
  conversionMaxFractionDigits = 2,
}: GetTokenPriceDisplayPropsArgs): TokenPriceDisplayProps => {
  const denominatedBalance = new BigNumberJs(available).div(
    new BigNumberJs(10).pow(decimals),
  );
  const fiatValue = denominatedBalance.times(price);

  return {
    rate: new BigNumberJs(price).toFixed(rateFractionDigits),
    conversion: valueToLocale(
      fiatValue.toString(),
      conversionMinFractionDigits,
      conversionMaxFractionDigits,
    ),
    isPriceStale,
  };
};

/**
 * Returns the token fiat value truncated to 2 dp (ROUND_DOWN), using the same
 * BigNumber arithmetic as getTokenPriceDisplayProps.
 */
export const getTokenFiatValueTruncated = ({
  available,
  decimals,
  price,
}: Pick<
  GetTokenPriceDisplayPropsArgs,
  'available' | 'decimals' | 'price'
>): number => {
  const denominatedBalance = new BigNumberJs(available).div(
    new BigNumberJs(10).pow(decimals),
  );
  return parseFloat(
    denominatedBalance.times(price).toFixed(2, BigNumberJs.ROUND_DOWN),
  );
};
