/* eslint-disable no-magic-numbers */
import { Percent } from '@cardano-sdk/util';

export const DEFAULT_DECIMALS = 2;

type FormatPercentagesOptions = {
  decimalPlaces?: number;
  rounding?: 'down' | 'half_up';
};

export const formatPercentages = (
  value: number | Percent,
  { decimalPlaces = DEFAULT_DECIMALS, rounding = 'half_up' }: FormatPercentagesOptions = {}
): string => {
  const unroundedValue = value.valueOf() * Math.pow(10, decimalPlaces) * 100;
  let roundedValue: number;
  switch (rounding) {
    case 'down':
      roundedValue = Math.floor(unroundedValue);
      break;
    case 'half_up':
      roundedValue = Math.round(unroundedValue);
      break;
  }

  return (roundedValue / Math.pow(10, decimalPlaces)).toFixed(decimalPlaces);
};
