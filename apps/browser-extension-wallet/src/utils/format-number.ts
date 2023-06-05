/* eslint-disable no-magic-numbers, new-cap */
import { Percent } from '@cardano-sdk/util';
import BigNumber from 'bignumber.js';
import { unitsMap } from './constants';
import { getNumberUnit } from './get-number-unit';

const DEFAULT_DECIMALS = 2;
const MILLION = 1_000_000;
const BILLION = 1_000_000_000;
const TRILLION = 1_000_000_000_000;
const QUADRILLION = 1_000_000_000_000_000;

const MAX_FRACTION_DIGIT_RANGE = 20;

type PlaceValue = 'unit' | 'ten' | 'hundred' | 'thousand' | 'million' | 'billion' | 'trillion' | 'quadrillion';

const getPlaceValue = (num: number): { numOfZeroes: number; hasDecimals: boolean; placeValue: PlaceValue } => {
  const fullNumber = Math.round(num).toLocaleString('fullwide', { useGrouping: false });
  const numOfZeroes = fullNumber.length - 1;
  const zeroes = { numOfZeroes, hasDecimals: Math.round(Number(fullNumber)) !== num };

  if (numOfZeroes < 1) return { ...zeroes, placeValue: 'unit' };
  if (numOfZeroes === 1) return { ...zeroes, placeValue: 'ten' };
  if (numOfZeroes === 2) return { ...zeroes, placeValue: 'hundred' };
  if (numOfZeroes < 6) return { ...zeroes, placeValue: 'thousand' };
  if (numOfZeroes < 9) return { ...zeroes, placeValue: 'million' };
  if (numOfZeroes < 12) return { ...zeroes, placeValue: 'billion' };
  if (numOfZeroes < 15) return { ...zeroes, placeValue: 'trillion' };

  return { ...zeroes, placeValue: 'quadrillion' };
};

export const formatCurrencyValue = (value: number | string, maximumFractionDigits?: number): string => {
  // this way if the value is less than DEFAULT_DECIMALS we not get the maximumFractionDigits value is out of range error.
  const defaultMaxFraction = maximumFractionDigits >= DEFAULT_DECIMALS ? maximumFractionDigits : DEFAULT_DECIMALS;
  // here we check that the defaultMaxFraction parameter is never greater than MAX_FRACTION_DIGIT_RANGE(20) https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#options
  const maximunmFraction =
    defaultMaxFraction <= MAX_FRACTION_DIGIT_RANGE ? defaultMaxFraction : MAX_FRACTION_DIGIT_RANGE;
  // TODO: get browser locale [LW-6089]
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: DEFAULT_DECIMALS,
    maximumFractionDigits: maximunmFraction
  });
};

const truncateNumber = (num: number) => num.toString().match(/^-?\d+(?:\.\d{0,2})?/)[0];

const shortenNumber = (str: string, length: number) =>
  str?.length > length ? `${str.slice(0, Math.max(0, length))}` : str;

export const getInlineCurrencyFormat = (value: string, maxDecimals = 0): string => {
  if (!value) return '0';
  const parsedStringValue = value.replace(/[^\d.]/g, '');

  if (!parsedStringValue.includes('.')) {
    return BigInt(parsedStringValue).toLocaleString('fullwide', { useGrouping: true });
  }

  const numberArr = parsedStringValue.split('.');

  const wholeNumber = BigInt(numberArr[0]).toLocaleString('fullwide', {
    useGrouping: true
  });
  const decimalNumber = numberArr.length > 2 ? numberArr.slice(1).join('') : shortenNumber(numberArr[1], maxDecimals);
  return maxDecimals > 0 ? `${wholeNumber}.${decimalNumber}` : wholeNumber;
};

// checks if user tries to remove comma from the formatted value, removes prev value otherwise
export const getChangedValue = ({
  currentCursorPosition,
  currentDisplayValue,
  displayValue
}: GetCaretPositionForFormattedCurrencyProps): {
  currentDisplayValue: string;
  value: string;
  currentCursorPosition: number;
} => {
  const lastChangedIndex = [...displayValue].findIndex((el, index) => el !== [...currentDisplayValue][index]);

  // check if the last (and the only) removed value is ','
  if (displayValue[lastChangedIndex] === ',' && displayValue.length - currentDisplayValue.length === 1) {
    const newDisplayValue = `${currentDisplayValue.slice(0, lastChangedIndex - 1)}${currentDisplayValue.slice(
      lastChangedIndex,
      currentDisplayValue.length
    )}`;

    return {
      currentDisplayValue: newDisplayValue,
      value: newDisplayValue.split(',').join(''),
      currentCursorPosition: Math.max(currentCursorPosition - 1, 0)
    };
  }

  return {
    currentDisplayValue,
    value: currentDisplayValue.split(',').join(''),
    currentCursorPosition
  };
};

type GetCaretPositionForFormattedCurrencyProps = {
  // current partially formatted value
  currentDisplayValue: string;
  // cursor position for current partially formatted value
  currentCursorPosition: number;
  // new formatted value
  displayValue: string;
};

export const getCaretPositionForFormattedCurrency = ({
  currentDisplayValue,
  displayValue,
  currentCursorPosition
}: GetCaretPositionForFormattedCurrencyProps): number => {
  const reversedValue = [...currentDisplayValue].reverse();

  // index of the last "changed" char index
  const lastChangedCharIndex = currentDisplayValue.length - currentCursorPosition;

  // index of "." char in case of decimal value
  const decimalIndex = reversedValue.indexOf('.');

  if (decimalIndex === -1 || lastChangedCharIndex > decimalIndex) {
    // put comma every 3 characters (getInlineCurrencyFormat)
    const groups = 3;
    // substring that starts from "." char (or just the end of value) till the changed char index
    // eg: for: prevValue = 123,456.678, newValue = 0,123,456.678 it would be 0,123,456
    const reversedWholePartTillLastChangedChar = reversedValue.slice(Math.max(decimalIndex, 0), lastChangedCharIndex);
    const reversedWholePartTillLastChangedCharWithoutCommas = reversedWholePartTillLastChangedChar
      .join('')
      .split(',')
      .join('');

    const numberOfCommasInPartiallyFormattedValue =
      reversedWholePartTillLastChangedChar.length - reversedWholePartTillLastChangedCharWithoutCommas.length;

    // number of possible ',' that could be placed by getInlineCurrencyFormat
    // eg: for 123456 -> 123,456 it would be 1 comma char
    const numberOfCommas = Math.max(
      Math.floor((reversedWholePartTillLastChangedCharWithoutCommas.length - 1) / groups),
      0
    );

    // get proper position (not for the reversed value)
    return displayValue.length - (lastChangedCharIndex - numberOfCommasInPartiallyFormattedValue + numberOfCommas);
  }

  return currentCursorPosition;
};

/**
 * returns formatted number with the corresponding unit
 */
export const formatNumber = (number: string): { number: string; unit?: string } => {
  const bigNumber = new BigNumber(number);

  if (bigNumber.isNaN()) {
    return { number };
  }

  const iterableKeys = unitsMap.keys();
  const { unit, value } = getNumberUnit(bigNumber, iterableKeys);
  const dividedBy = value.isZero() ? 1 : value;
  return { number: bigNumber.div(dividedBy).decimalPlaces(2).toString(), unit };
};

export const formatLocaleNumber = (value: string, decimalPlaces: number = DEFAULT_DECIMALS): string =>
  new BigNumber(value).toFormat(decimalPlaces, {
    groupSize: 3,
    groupSeparator: ',',
    decimalSeparator: '.'
  });

export const isNumeric = (str: string): boolean => {
  if (typeof str !== 'string') return false;
  return !Number.isNaN(str) && !Number.isNaN(Number.parseFloat(str));
};

export const formatPercentages = (number: number | Percent, decimalPlaces: number = DEFAULT_DECIMALS): string =>
  (Math.round(number.valueOf() * 100 * 100) / 100).toFixed(decimalPlaces);

export const compactNumber = (value: number | string, decimal?: number): string => {
  const numericValue = value ? Number(value) : 0;

  if (Number.isNaN(numericValue)) return '0';

  const notationsMap = new Map([
    ['million', { notation: 'M', integerValue: MILLION }],
    ['billion', { notation: 'B', integerValue: BILLION }],
    ['trillion', { notation: 'T', integerValue: TRILLION }],
    ['quadrillion', { notation: 'Q', integerValue: QUADRILLION }]
  ]);

  const valueInfo = getPlaceValue(numericValue);
  if (valueInfo.numOfZeroes < 6) return formatCurrencyValue(numericValue, decimal);

  const valueNotation = notationsMap.get(valueInfo.placeValue);
  const valueToFormat = numericValue / valueNotation.integerValue;
  if (valueInfo.numOfZeroes > 18) return `${formatCurrencyValue(valueToFormat)}${valueNotation.notation}`;
  return `${formatCurrencyValue(truncateNumber(valueToFormat))}${valueNotation.notation}`;
};
