import BigNumber from 'bignumber.js';
import { unitsMap } from './constants';

interface IUnitRange {
  gt: BigNumber;
  lt: BigNumber;
}

type GetNumberMapKey = (
  /**
   * number of which the unit is wanted to obtain
   */
  value: BigNumber,
  /**
   * An iterable with a list of keys belonging to the unit map
   */
  keys: IterableIterator<string>,
  /**
   * a map with the units information
   */
  units?: Map<string, IUnitRange>,
  /**
   * a fallback key if the value is not in a given range
   * this key should exist on units map
   */
  fallbackKey?: string
) => { unit: string; unitThreshold: BigNumber };

/**
 * Returns the number unit and its threshold based on the given value
 *
 * @example
 * const result = getNumberUnit(new BigNumber(2500), unitsMap.keys());
 * console.log(result);
 * // Output: { unit: 'K', unitThreshold: new BigNumber(1000) }
 */
export const getNumberUnit: GetNumberMapKey = (value, keys, units = unitsMap, fallbackKey = 'B') => {
  const resultKey = keys.next();

  if (resultKey.done) {
    const fallbackUnitRange = units.get(fallbackKey);
    return { unit: fallbackKey, unitThreshold: fallbackUnitRange.gt };
  }

  const unitRange = units.get(resultKey.value);

  if (value.gte(unitRange.gt) && value.lt(unitRange.lt)) {
    return { unit: resultKey.value, unitThreshold: unitRange.gt };
  }

  return getNumberUnit(value, keys, units, fallbackKey);
};
