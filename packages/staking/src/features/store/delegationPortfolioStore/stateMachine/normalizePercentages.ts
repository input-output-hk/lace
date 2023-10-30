import { PERCENTAGE_SCALE_MAX } from '../constants';

// Rounds values of integer properties of an input array of objects, while keeping the sum of the numbers equal to 100 (PERCENTAGE_SCALE_MAX)
// Requires input array to sum to 100
// Examples: normalizePercentages([{val: 33.33},{val: 33.33},{val: 33.33}], 'val')
//                            =>  [{val: 34},   {val: 33},   {val: 33}   ]
export const normalizePercentages = <K extends string, T extends { [key in K]: number }>(items: T[], key: K) => {
  const currentSum = items.reduce((acc, item) => acc + item[key], 0);
  const epsilon = 0.1;

  const itemsWithRoundedNumbers: T[] = items.map((item) => ({ ...item, [key]: Math.round(item[key]) }));
  if (Math.abs(currentSum - PERCENTAGE_SCALE_MAX) > epsilon) {
    console.error(`Percentages must add up to ${PERCENTAGE_SCALE_MAX}, instead they add up to ${currentSum}`);
    // fall back to naive rounding
    return itemsWithRoundedNumbers;
  }

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
