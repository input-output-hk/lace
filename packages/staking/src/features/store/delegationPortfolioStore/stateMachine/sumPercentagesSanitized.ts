import BigNumber from 'bignumber.js';

// Sums numbers in an array of objects, avoids JS-precision issues
// Intended for summing mainly onchain (float) percentages, without which there would be precision errors
export const sumPercentagesSanitized = <K extends string, T extends { [key in K]: number }>({
  items,
  key,
  // eslint-disable-next-line no-magic-numbers
  decimals = 10,
}: {
  items: T[];
  key: K;
  decimals?: number;
}) => {
  // BigNumbers are used to avoid vanilla-JS precision issues, see unit test
  const sum = items.reduce((acc, item) => acc.plus(new BigNumber(item[key])), new BigNumber(0));
  // cut-off at N or 10 decimal places
  return Number(sum.toFixed(decimals));
};
