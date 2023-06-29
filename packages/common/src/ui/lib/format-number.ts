/* eslint-disable no-magic-numbers */
import { Percent } from '@cardano-sdk/util';

export const DEFAULT_DECIMALS = 2;

export const formatPercentages = (number: number | Percent, decimalPlaces: number = DEFAULT_DECIMALS): string =>
  (Math.round(number.valueOf() * 100 * 100) / 100).toFixed(decimalPlaces);
