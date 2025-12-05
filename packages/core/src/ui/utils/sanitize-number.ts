import BigNumber from 'bignumber.js';

const parseValueToBigNumberString = (value: string) =>
  new BigNumber(value).isNaN() ? value.replace(/[^\d.]/g, '') : new BigNumber(value).toString();

// check for invalid characters, if there are invalid characters, returns current value, if not, parse it
export const sanitizeNumber = (value: string): string => {
  const parsedValue = value.replace(/[^\d.]/g, '');
  return new RegExp('(\\.)(0+)?$').test(parsedValue) ? parsedValue : parseValueToBigNumberString(parsedValue);
};
