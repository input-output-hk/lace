import { PERCENTAGE_SCALE_MAX } from '../constants';
import { sumPercentagesSanitized } from './sumPercentagesSanitized';

/**
 * Rounds values of properties of an input array of objects, while keeping the sum of the numbers equal to 100 (PERCENTAGE_SCALE_MAX)
 * Requires input array to sum to 100 +- epsilon
 * Works at arbitrary decimal precision
 * Examples:
 * ```
 *           normalizePercentages({items: [{val: 33.33},{val: 33.33},{val: 33.33}], key: 'val', decimals: 0})
 *                            =>          [{val: 34},   {val: 33},   {val: 33}   ]
 * ```
 * ```
 *           normalizePercentages({items: [{val: 33.333},{val: 33.333},{val: 33.333}], key: 'val', decimals: 2})
 *                            =>          [{val: 33.34}, {val: 33.33}, {val: 33.33} ]
 * ```
 */
export const normalizePercentages = <K extends string, T extends { [key in K]: number }>({
  items,
  key,
  decimals = 0,
}: {
  items: T[];
  key: K;
  decimals?: number;
}) => {
  const currentSum = sumPercentagesSanitized({ items, key });
  const epsilon = 0.1;
  if (Math.abs(currentSum - PERCENTAGE_SCALE_MAX) > epsilon) {
    throw new Error(`Percentages must sum to ${PERCENTAGE_SCALE_MAX}`);
  }

  // Scale up the numbers to round them at the `decimals` decimal place
  // eslint-disable-next-line no-magic-numbers
  const scaleUpFactor = 10 ** decimals;
  const scaledItems = items.map((item) => ({ ...item, [key]: item[key] * scaleUpFactor }));
  const itemsWithRoundedNumbers: T[] = scaledItems.map((item) => ({ ...item, [key]: Math.round(item[key]) }));

  // Calculate the adjustment needed to make the sum exactly equal to 100 (PERCENTAGE_SCALE_MAX) * scaleUpFactor
  const adjustment =
    PERCENTAGE_SCALE_MAX * scaleUpFactor - itemsWithRoundedNumbers.reduce((acc, item) => acc + item[key], 0);

  // Distribute the adjustment among the numbers (at the start of array)
  const numberOfItemsToTweak = Math.abs(adjustment);
  const factor = adjustment > 0 ? 1 : -1;

  return itemsWithRoundedNumbers.map((item, index) => {
    const nextValue = index < numberOfItemsToTweak ? item[key] + factor : item[key];
    return {
      ...item,
      [key]: nextValue / scaleUpFactor,
    };
  });
};
