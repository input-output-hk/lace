import { PERCENTAGE_SCALE_MAX } from '../constants';

// Rounds values of integer properties of an input array of objects, while keeping the sum of the numbers equal to 100 (PERCENTAGE_SCALE_MAX)
// Requires input array to sum to 100
// Examples: roundPercentages([33.3, 33.3, 33.3]) => [34, 33, 33]
export const roundPercentages = <K extends string, T extends { [key in K]: number }>(items: T[], key: K) => {
  const currentSum = items.reduce((acc, item) => acc + item[key], 0);
  const epsilon = 0.1;
  if (Math.abs(currentSum - PERCENTAGE_SCALE_MAX) > epsilon)
    throw new Error(`Percentages must sum to ${PERCENTAGE_SCALE_MAX}`);

  const itemsWithRoundedNumbers: T[] = items.map((item) => ({ ...item, [key]: Math.round(item[key]) }));

  // Calculate the adjustment needed to make the sum exactly equal to 100 (PERCENTAGE_SCALE_MAX)
  const adjustment = PERCENTAGE_SCALE_MAX - itemsWithRoundedNumbers.reduce((acc, item) => acc + item[key], 0);

  // Distribute the adjustment among the numbers (at the start of array)
  const numberOfItemsToTweak = Math.abs(adjustment);
  const factor = adjustment > 0 ? 1 : -1;

  return itemsWithRoundedNumbers.map((item, index) => {
    const nextValue = index < numberOfItemsToTweak ? item[key] + factor : item[key];
    return {
      ...item,
      [key]: nextValue,
    };
  });
};
