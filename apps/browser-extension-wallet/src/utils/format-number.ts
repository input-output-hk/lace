/* eslint-disable no-magic-numbers */
import { DEFAULT_DECIMALS, getNumberUnit, UnitThreshold } from '@lace/common';
import BigNumber from 'bignumber.js';

type FormattedValueChange = {
  // new value formatted by formatNumberForDisplay
  newFormattedValue: string;
  // previous value formatted by formatNumberForDisplay
  previousFormattedValue: string;
};

interface HandleFormattedValueChangeResponse {
  formattedValue: string;
  value: string;
  characterOffset: number;
}

/**
 * Shortens a number to a desired length
 * @param str The string representation of the number
 * @param length The new desired length
 * @returns The shortened number as a string
 */
export const shortenNumber = (str: string, length: number): string =>
  length > 0 && str?.length > length ? `${str.slice(0, length)}` : str;

/**
 * Checks if a given string is a valid numeric value.
 *
 * @param str The string to be checked.
 * @returns `true` if the string is a valid numeric value, `false` otherwise.
 */
export const isNumeric = (str: string): boolean => !new BigNumber(str).isNaN();

/**
 * Formats a numeric string value with the specified decimal places.
 *
 * @param value The numeric string value to be formatted.
 * @param decimalPlaces The number of decimal places.
 * @returns The formatted number string.
 */
export const formatLocaleNumber = (value: string, decimalPlaces: number = DEFAULT_DECIMALS): string =>
  new BigNumber(value).toFormat(decimalPlaces, BigNumber.ROUND_DOWN, {
    groupSize: 3,
    // TODO: get from locale [LW-6089]
    groupSeparator: ',',
    decimalSeparator: '.'
  });

/**
 * Formats a numeric string with optional decimal places.
 *
 * @param value The number string to be formatted.
 * @param maxDecimals The maximum number of decimal places to include. Default is 0.
 * @returns The formatted number string.
 */
export const formatNumberForDisplay = (value?: string, maxDecimals = 0): string => {
  if (!value) return '0';
  // Remove any character that is not a dot or a number
  const parsedStringValue = value.replace(/[^\d.]/g, '');

  // Split the integer and the decimal parts
  const numParts = parsedStringValue.split('.');
  // Format the integer part to locale string with grouping
  const integerPart = formatLocaleNumber(numParts[0] || '0', 0);

  // If there is more than one dot, keep the first and remove the rest joining the numbers.
  const decimalPart = numParts.length > 2 ? numParts.slice(1).join('') : numParts[1];

  // Shorten the decimal part to the provided maxDecimals and concat to the integer part
  //   or just return the integer part if there is no decimal part or maxDecimals is <= 0
  return numParts.length > 1 && maxDecimals > 0
    ? `${integerPart}.${shortenNumber(decimalPart, maxDecimals)}`
    : integerPart;
};

/**
 * Checks if the user tries to remove a comma from the previous value and also removes the character before it.
 * Otherwise, returns the new value as it is.
 *
 * It also returns an offset to indicate the difference between the characters of
 * the new formatted value received as parameter and the formatted value returned by this function
 */
export const handleFormattedValueChange = (
  { newFormattedValue, previousFormattedValue }: FormattedValueChange,
  maxDecimals = 0
): HandleFormattedValueChangeResponse => {
  // Finds first different character between previous and new value
  const firstChangedCharIndex = [...previousFormattedValue].findIndex(
    (char, index) => char !== [...newFormattedValue][index]
  );

  // Check if there was only one change between new and previous value, if it is a comma and if it was deleted by comparing their lengths
  if (
    firstChangedCharIndex !== -1 &&
    previousFormattedValue[firstChangedCharIndex] === ',' &&
    previousFormattedValue.length - newFormattedValue.length === 1
  ) {
    if (firstChangedCharIndex === 0) {
      // If the deleted comma was the first character, then don't try to delete any other character
      const value = newFormattedValue.split(',').join('');
      return { formattedValue: value ? formatNumberForDisplay(value, maxDecimals) : '', value, characterOffset: 0 };
    }

    // If a comma was deleted in the new value then also delete the character before the comma
    const afterCommaDeletionValue = `${newFormattedValue.slice(0, firstChangedCharIndex - 1)}${newFormattedValue.slice(
      firstChangedCharIndex,
      newFormattedValue.length
    )}`;

    // New value without any commas
    const value = afterCommaDeletionValue.split(',').join('');
    return {
      // New formatted value without the deleted comma and the character before it, still has all other commas
      formattedValue: value ? formatNumberForDisplay(value, maxDecimals) : '',
      value,
      characterOffset: -1 // Reposition cursor one extra character besides the comma was deleted
    };
  }

  const value = newFormattedValue.split(',').join('');
  const formattedValue = value ? formatNumberForDisplay(value, maxDecimals) : '';
  // If the change was not the deletion of a comma then return the new value as it is
  return {
    formattedValue,
    value,
    // Reposition cursor depending on changes to newFormattedValue after formatNumberForDisplay
    characterOffset: formattedValue.length - newFormattedValue.length
  };
};

/**
 * Returns a formatted string of a number value with the desired decimal places (2 by default) and its corresponding unit.
 * If the value has more decimals places than the desired amount, it will be truncated.
 *
 * @param value The value to be formatted
 * @param decimals The desired decimal places (default = 2)
 * @returns The formatted value with the desired decimals and the unit as a string
 */
export const compactNumberWithUnit = (value?: number | string, decimals = DEFAULT_DECIMALS): string => {
  const bigNumberValue = value ? new BigNumber(value) : new BigNumber(0);

  if (bigNumberValue.isNaN()) return formatLocaleNumber('0', decimals);
  const { unit, unitThreshold } = getNumberUnit(bigNumberValue);
  if (unitThreshold < UnitThreshold.MILLION) return formatLocaleNumber(bigNumberValue.toString(), decimals);

  const valueToFormat = bigNumberValue.dividedBy(unitThreshold);
  return `${formatLocaleNumber(valueToFormat.toString(), decimals)}${unit}`;
};

export const formatBalance = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return value.toString();
};
