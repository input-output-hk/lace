/* eslint-disable no-magic-numbers */
import BigNumber from 'bignumber.js';
import { Percent } from '@cardano-sdk/util';
import { UnitThreshold, getNumberUnit } from './get-number-unit';

export const DEFAULT_DECIMALS = 2;

type FormatPercentagesOptions = {
  decimalPlaces?: number;
  // rounding terminology inspired by bignumber.js
  // https://mikemcl.github.io/bignumber.js/#constructor-properties
  rounding?: 'down' | 'halfUp';
};

/**
 * Formats a numeric string to have a maximum of two decimal places and returns its corresponding unit.
 *
 * @param number The number string to be formatted and to get its unit
 * @returns An object with the formatted number and its corresponding unit
 */
export const getNumberWithUnit = (number: BigNumber.Value): { number: string; unit: string } => {
  const bigNumber = new BigNumber(number);
  if (bigNumber.isNaN()) return { number: number.toString(), unit: '' };

  const { unit, unitThreshold } = getNumberUnit(bigNumber);
  const threshold = unitThreshold === UnitThreshold.ZERO ? 1 : unitThreshold;
  return { number: bigNumber.div(threshold).decimalPlaces(2).toString(), unit };
};

export const formatPercentages = (
  value: number | Percent,
  { decimalPlaces = DEFAULT_DECIMALS, rounding = 'halfUp' }: FormatPercentagesOptions = {}
): string => {
  const unroundedValue = value.valueOf() * Math.pow(10, decimalPlaces) * 100;
  let roundedValue: number;
  switch (rounding) {
    case 'down':
      roundedValue = Math.floor(unroundedValue);
      break;
    case 'halfUp':
      roundedValue = Math.round(unroundedValue);
      break;
  }

  return (roundedValue / Math.pow(10, decimalPlaces)).toFixed(decimalPlaces);
};
