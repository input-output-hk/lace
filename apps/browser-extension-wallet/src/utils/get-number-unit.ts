/* eslint-disable no-magic-numbers */
import BigNumber from 'bignumber.js';

export enum UnitSymbol {
  ZERO = '',
  THOUSAND = 'K',
  MILLION = 'M',
  BILLION = 'B',
  TRILLION = 'T',
  QUADRILLION = 'Q'
}

export enum UnitThreshold {
  ZERO = 0,
  THOUSAND = 1e3,
  MILLION = 1e6,
  BILLION = 1e9,
  TRILLION = 1e12,
  QUADRILLION = 1e15
}

// Sorted in descending order
const thresholdsMap = new Map<UnitSymbol, UnitThreshold>([
  [UnitSymbol.QUADRILLION, UnitThreshold.QUADRILLION],
  [UnitSymbol.TRILLION, UnitThreshold.TRILLION],
  [UnitSymbol.BILLION, UnitThreshold.BILLION],
  [UnitSymbol.MILLION, UnitThreshold.MILLION],
  [UnitSymbol.THOUSAND, UnitThreshold.THOUSAND],
  [UnitSymbol.ZERO, UnitThreshold.ZERO]
]);

/**
 * Returns the number unit and its threshold based on the given value
 *
 * @example
 * const result = getNumberUnit(new BigNumber(25000));
 * console.log(result); // { unit: 'K', unitThreshold: new BigNumber(1000) }
 */
export const getNumberUnit = (
  value: string | number | BigNumber
): { unit: UnitSymbol; unitThreshold: UnitThreshold } => {
  const valueBN = new BigNumber(value);
  for (const [unit, threshold] of thresholdsMap.entries()) {
    if (valueBN.abs().gte(threshold)) {
      return { unit, unitThreshold: threshold };
    }
  }
  return { unit: UnitSymbol.ZERO, unitThreshold: UnitThreshold.ZERO };
};
