// Sums numbers in an array of objects, avoids JS-precision issues
// Intended for summing mainly onchain (float) percentages, without which there would be precision errors
export const sumPercentagesLossless = <K extends string, T extends { [key in K]: number }>({
  items,
  key,
}: {
  items: T[];
  key: K;
}) => {
  const sum = items.reduce((acc, item) => acc + item[key], 0);
  // cut-off at 10 decimal places
  // eslint-disable-next-line no-magic-numbers
  return Number(sum.toFixed(10));
};
