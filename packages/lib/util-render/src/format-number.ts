import BigNumberJs from 'bignumber.js';

export const DEFAULT_DECIMALS = 2;

export type LocaleSeparators = {
  groupSeparator: string;
  decimalSeparator: string;
};

const separatorCache = new Map<string, LocaleSeparators>();

/**
 * Gets the thousands and decimal separators for the current locale.
 * Uses Intl.NumberFormat to detect the separators dynamically.
 * Results are cached for performance.
 *
 * @param locale Optional locale string (e.g., 'en-US', 'de-DE'). Defaults to system locale.
 * @returns Object with groupSeparator and decimalSeparator
 */
export const getLocaleSeparators = (locale?: string): LocaleSeparators => {
  const key = locale ?? 'default';

  const cached = separatorCache.get(key);
  if (cached) {
    return cached;
  }

  // Format a test number that will have both group and decimal separators
  // e.g., "1,234.5" (en-US) or "1.234,5" (de-DE)
  const formatted = new Intl.NumberFormat(locale).format(1234.5);

  // Remove all digits to extract just the separators in order
  // "1,234.5" -> ",." or "1.234,5" -> ".,"
  const separators = formatted.replace(/\d/g, '');

  const result: LocaleSeparators = {
    groupSeparator: separators[0] || ',',
    decimalSeparator: separators[1] || '.',
  };

  separatorCache.set(key, result);
  return result;
};

export enum UnitThreshold {
  NONE = 1,
  THOUSAND = 1_000,
  MILLION = 1_000_000,
  BILLION = 1_000_000_000,
  TRILLION = 1_000_000_000_000,
  QUADRILLION = 1_000_000_000_000_000,
}

type FormatNumberOptions = {
  amount: string;
  tokenDecimal?: number;
  displayDecimalPlace?: number;
  abbreviationThreshold?: UnitThreshold.MILLION | UnitThreshold.THOUSAND;
  removeTrailingZeros?: boolean;
};

/**
 * Gets the appropriate unit and threshold for a given number
 */
export const getNumberUnit = (
  value: BigNumberJs,
): { unit: string; unitThreshold: UnitThreshold } => {
  const absValue = value.abs();

  if (absValue.gte(UnitThreshold.QUADRILLION)) {
    return { unit: 'Q', unitThreshold: UnitThreshold.QUADRILLION };
  }
  if (absValue.gte(UnitThreshold.TRILLION)) {
    return { unit: 'T', unitThreshold: UnitThreshold.TRILLION };
  }
  if (absValue.gte(UnitThreshold.BILLION)) {
    return { unit: 'B', unitThreshold: UnitThreshold.BILLION };
  }
  if (absValue.gte(UnitThreshold.MILLION)) {
    return { unit: 'M', unitThreshold: UnitThreshold.MILLION };
  }
  if (absValue.gte(UnitThreshold.THOUSAND)) {
    return { unit: 'K', unitThreshold: UnitThreshold.THOUSAND };
  }

  return { unit: '', unitThreshold: UnitThreshold.NONE };
};

/**
 * Formats a numeric string value with the specified decimal places.
 *
 * @param value The numeric string value to be formatted.
 * @param decimalPlaces The number of decimal places.
 * @returns The formatted number string with locale-appropriate separators.
 */
export const formatLocaleNumber = (
  value: string,
  decimalPlaces: number = DEFAULT_DECIMALS,
): string => {
  const { groupSeparator, decimalSeparator } = getLocaleSeparators();
  return new BigNumberJs(value).toFormat(
    decimalPlaces,
    BigNumberJs.ROUND_DOWN,
    {
      groupSize: 3,
      groupSeparator,
      decimalSeparator,
    },
  );
};

/**
 * Returns a formatted string of a number value with the desired decimal places (2 by default) and its corresponding unit.
 * If the value has more decimals places than the desired amount, it will be truncated.
 *
 * @param value The value to be formatted
 * @param decimals The desired decimal places (default = 2)
 * @param abbreviationThreshold The threshold from which the number will be abbreviated (default = MILLION)
 * @returns The formatted value with the desired decimals and the unit as a string
 */
export const compactNumberWithUnit = (
  value: string,
  decimals = DEFAULT_DECIMALS,
  abbreviationThreshold = UnitThreshold.MILLION,
): string => {
  const bigNumberValue = value ? new BigNumberJs(value) : new BigNumberJs(0);
  if (bigNumberValue.isNaN()) return formatLocaleNumber('0', decimals);

  const { unit, unitThreshold } = getNumberUnit(bigNumberValue);
  if (unitThreshold < abbreviationThreshold)
    return formatLocaleNumber(bigNumberValue.toString(), decimals);

  const valueToFormat = bigNumberValue.dividedBy(unitThreshold);
  return `${formatLocaleNumber(valueToFormat.toString(), decimals)}${unit}`;
};

/**
 * Formats a raw token amount to a human-readable string with unit abbreviations (K, M, B, T, Q).
 *
 * By default, formats to the specified `displayDecimalPlace` with zero-padding.
 * When `removeTrailingZeros` is true, displays full decimals only if there are non-zero digits.
 *
 * Examples (with removeTrailingZeros=true):
 * - 22.535842 with 6 decimals → "22.535842" (shows all decimals)
 * - 22.535000 with 6 decimals → "22.535" (truncates trailing zeros)
 *
 * @param amount The raw token amount as a string
 * @param tokenDecimal The number of decimal places for the token (default = 0)
 * @param displayDecimalPlace The number of decimal places to display (default = 2)
 * @param abbreviationThreshold The threshold from which to abbreviate (default = MILLION)
 * @param removeTrailingZeros If true, removes trailing zeros after decimal point (default = true)
 * @returns The formatted value with unit abbreviation and desired decimal places
 */
export const formatAmountRawToCompact = ({
  amount,
  tokenDecimal = 0,
  displayDecimalPlace = DEFAULT_DECIMALS,
  abbreviationThreshold = UnitThreshold.MILLION,
  removeTrailingZeros = true,
}: FormatNumberOptions): string => {
  const denominated = convertAmountToDenominated(amount, tokenDecimal);
  const bigNumberValue = denominated
    ? new BigNumberJs(denominated)
    : new BigNumberJs(0);

  if (bigNumberValue.isNaN())
    return formatLocaleNumber('0', displayDecimalPlace);

  const { unit, unitThreshold } = getNumberUnit(bigNumberValue);

  // Determine if we should abbreviate based on threshold
  const shouldAbbreviate = unitThreshold >= abbreviationThreshold;

  // Determine the value to format (abbreviated or not)
  const valueToFormat = shouldAbbreviate
    ? bigNumberValue.dividedBy(unitThreshold)
    : bigNumberValue;

  // Calculate decimal places to use
  let decimalPlacesToUse = displayDecimalPlace;

  if (removeTrailingZeros) {
    // Get actual decimal places in the value
    const actualDecimals = valueToFormat.decimalPlaces() ?? 0;
    // Use the minimum of actual decimals and display decimal places
    // This ensures trailing zeros are removed while respecting the max decimals
    decimalPlacesToUse = Math.min(actualDecimals, displayDecimalPlace);
  }

  const formattedValue = formatLocaleNumber(
    valueToFormat.toString(),
    decimalPlacesToUse,
  );

  // Only append unit if we're abbreviating
  return shouldAbbreviate ? `${formattedValue}${unit}` : formattedValue;
};

/**
 * Formats amount
 *
 * @param amount Tokens amount to be formatted
 * @param decimals Tokens decimals number
 * @param decimalPlaces Number of decimal places for formatted amount
 */
export const formatAmountRawToDenominated = (
  amount: string,
  decimals = 0,
  decimalPlaces = 2,
): string =>
  new BigNumberJs(amount).div(10 ** decimals).toFormat(decimalPlaces);

export const convertAmountToDenominated = (
  amount: string,
  decimals = 0,
): string =>
  new BigNumberJs(amount).div(new BigNumberJs(10).pow(decimals)).toString();

export const convertAmountToNormalized = (
  amount: string,
  decimals = 0,
): string => new BigNumberJs(amount).times(10 ** decimals).toString();

/**
 * Formats a numeric value to a locale-sensitive string with thousands separators.
 * Uses BigNumberJs for arbitrary precision and Intl.NumberFormat for locale detection.
 *
 * @param value The numeric value to format (string or number)
 * @param minimumFractionDigits Minimum decimal places to show (pads with zeros)
 * @param maximumFractionDigits Maximum decimal places to show (truncates with ROUND_DOWN)
 * @returns Formatted string with locale-appropriate separators
 */
export const valueToLocale = (
  value: number | string,
  minimumFractionDigits = 0,
  maximumFractionDigits = 20,
): string => {
  const valueInBigNumber = new BigNumberJs(value);

  if (valueInBigNumber.isNaN()) return '0';

  // Determine decimal places: at least minimumFractionDigits, at most maximumFractionDigits
  const actualDecimals = valueInBigNumber.decimalPlaces() ?? 0;
  const decimalPlaces = Math.max(
    minimumFractionDigits,
    Math.min(actualDecimals, maximumFractionDigits),
  );

  const { groupSeparator, decimalSeparator } = getLocaleSeparators();

  return valueInBigNumber.toFormat(decimalPlaces, BigNumberJs.ROUND_DOWN, {
    groupSize: 3,
    groupSeparator,
    decimalSeparator,
  });
};

/**
 * Parses a locale-formatted number string back to a normalized number string.
 * Uses the current locale's separators to correctly interpret the input.
 *
 * @param value The locale-formatted number string (e.g., "1,234.56" or "1.234,56")
 * @returns Normalized number string with '.' as decimal separator (e.g., "1234.56")
 */
export const parseLocaleNumber = (value: string): string => {
  if (!value || value.trim() === '') return '0';

  const cleaned = value.replace(/[^\d.,-]/g, '');
  if (!cleaned) return '0';

  // Get the actual locale separators - don't guess!
  const { groupSeparator, decimalSeparator } = getLocaleSeparators();

  // Remove all group separators (need to escape '.' for regex)
  const groupSeparatorRegex =
    groupSeparator === '.' ? /\./g : new RegExp(groupSeparator, 'g');
  const withoutGroupSeparators = cleaned.replace(groupSeparatorRegex, '');

  // Replace the locale's decimal separator with standard '.'
  if (decimalSeparator !== '.') {
    return withoutGroupSeparators.replace(decimalSeparator, '.');
  }

  return withoutGroupSeparators;
};

export const formatAmountToLocale = (
  amount: string,
  decimals: number,
  maxFractionDigits = 20,
): string => {
  if (!amount || amount.trim() === '') return '0';

  const denominated = convertAmountToDenominated(amount, decimals);
  const denominatedInBigNumber = new BigNumberJs(denominated);

  if (denominatedInBigNumber.isNaN()) return '0';

  const decimalPlaces = Math.min(
    denominatedInBigNumber.decimalPlaces() ?? 0,
    maxFractionDigits,
  );

  const { groupSeparator, decimalSeparator } = getLocaleSeparators();

  return denominatedInBigNumber.toFormat(
    decimalPlaces,
    BigNumberJs.ROUND_DOWN,
    {
      groupSize: 3,
      groupSeparator,
      decimalSeparator,
    },
  );
};

export const formatRawToLocale = (
  rawValue: string,
  maxFractionDigits = 20,
): string => {
  if (!rawValue || rawValue.trim() === '') return '';
  const number = Number(rawValue);
  if (isNaN(number)) return '';
  return valueToLocale(number, 0, maxFractionDigits);
};

export const rawToBigInt = (rawValue: string, decimals: number): bigint => {
  if (!rawValue || rawValue.trim() === '') return 0n;
  const normalized = convertAmountToNormalized(rawValue, decimals);

  const integerPart = parseInt(normalized.split('.')[0], 10);
  return BigInt(integerPart || '0');
};

export const bigIntToRaw = (bigIntValue: bigint, decimals: number): string => {
  return convertAmountToDenominated(bigIntValue.toString(), decimals);
};

export const shouldCompactDustValue = (value: string) => {
  const normalized = parseLocaleNumber(value || '0');
  const digitsCount = normalized.replace(/[^\d]/g, '').length;

  return digitsCount > 9;
};
