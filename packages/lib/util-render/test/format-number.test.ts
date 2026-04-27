import { describe, expect, it, test } from 'vitest';

import * as formatNumber from '../src/format-number';

describe('format-number', () => {
  describe('formatAmountRawToDenominated', () => {
    it('formats amount to have 2 decimal places by default', () => {
      const amount = '5000000';
      const expected = '5,000,000.00';

      expect(formatNumber.formatAmountRawToDenominated(amount)).toEqual(
        expected,
      );
    });

    it('formats amount for token with 6 decimals', () => {
      const amount = '5000000';
      const decimals = 6;
      const expected = '5.00';

      expect(
        formatNumber.formatAmountRawToDenominated(amount, decimals),
      ).toEqual(expected);
    });

    it('formats amount for token with 2 decimals', () => {
      const amount = '5000000';
      const decimals = 2;
      const decimalPlaces = 4;
      const expected = '50,000.0000';

      expect(
        formatNumber.formatAmountRawToDenominated(
          amount,
          decimals,
          decimalPlaces,
        ),
      ).toEqual(expected);
    });
  });

  describe('formatLocaleNumber', () => {
    test('uses "." to separate decimals and "," to separate groups of 3 digits', () => {
      expect(formatNumber.formatLocaleNumber('1000000.55', 2)).toEqual(
        '1,000,000.55',
      );
    });

    describe('formats the number with the desired amount of decimals', () => {
      test('rounds number to 0 if the original value has more decimals than desired', () => {
        expect(formatNumber.formatLocaleNumber('999.99', 1)).toEqual('999.9'); // does not round up
        expect(formatNumber.formatLocaleNumber('999.44', 1)).toEqual('999.4');
      });

      test('fills with zeroes if the amount of desired decimals is greater than in the original value', () => {
        expect(formatNumber.formatLocaleNumber('999.999', 4)).toEqual(
          '999.9990',
        );
        expect(formatNumber.formatLocaleNumber('999', 4)).toEqual('999.0000'); // no decimals in original
      });

      test('defaults to 2 decimals if no amount for decimal places was provided', () => {
        expect(formatNumber.formatLocaleNumber('100')).toEqual('100.00');
      });

      test('no decimal part if 0 is the desired amount', () => {
        expect(formatNumber.formatLocaleNumber('500.999', 0)).toEqual('500');
      });

      test('works with negative values', () => {
        expect(formatNumber.formatLocaleNumber('-999.999')).toEqual('-999.99');
        expect(formatNumber.formatLocaleNumber('-100.12')).toEqual('-100.12');
        expect(formatNumber.formatLocaleNumber('-100')).toEqual('-100.00');
      });
    });
  });

  describe('formatAmountRawToCompact', () => {
    it('formats a denominated amount without abbreviation when under the threshold', () => {
      const result = formatNumber.formatAmountRawToCompact({
        amount: '5000000',
        tokenDecimal: 6,
      });
      expect(result).toEqual('5');
    });

    it('formats and compacts a denominated amount when over the threshold', () => {
      const result = formatNumber.formatAmountRawToCompact({
        amount: '1500000000000',
        tokenDecimal: 6,
      });
      expect(result).toEqual('1.5M');
    });

    it('formats a denominated amount with thousands separator when under the abbreviation threshold', () => {
      const result = formatNumber.formatAmountRawToCompact({
        amount: '999999000000',
        tokenDecimal: 6,
      });
      expect(result).toEqual('999,999');
    });

    it('uses a custom display decimal place', () => {
      const result = formatNumber.formatAmountRawToCompact({
        amount: '1234567000000',
        tokenDecimal: 6,
        displayDecimalPlace: 4,
      });
      expect(result).toEqual('1.2345M');
    });

    it('uses a custom abbreviation threshold', () => {
      const result = formatNumber.formatAmountRawToCompact({
        amount: '5000000000',
        tokenDecimal: 6,
        abbreviationThreshold: formatNumber.UnitThreshold.THOUSAND,
      });
      expect(result).toEqual('5K');
    });

    it('handles zero amount', () => {
      const result = formatNumber.formatAmountRawToCompact({
        amount: '0',
        tokenDecimal: 6,
      });
      expect(result).toEqual('0');
    });

    it('handles different token decimals', () => {
      const result = formatNumber.formatAmountRawToCompact({
        amount: '1500000000000000000000',
        tokenDecimal: 18,
      });
      expect(result).toEqual('1,500');
    });

    it('preserves trailing zeros when removeTrailingZeros is false', () => {
      const result = formatNumber.formatAmountRawToCompact({
        amount: '5000000',
        tokenDecimal: 6,
        removeTrailingZeros: false,
      });
      expect(result).toEqual('5.00');
    });

    it('removes trailing zeros by default', () => {
      const result = formatNumber.formatAmountRawToCompact({
        amount: '5000000',
        tokenDecimal: 6,
      });
      expect(result).toEqual('5');
    });

    it('shows actual decimals when they exist and removeTrailingZeros is true', () => {
      const result = formatNumber.formatAmountRawToCompact({
        amount: '5123456',
        tokenDecimal: 6,
        displayDecimalPlace: 4,
      });
      expect(result).toEqual('5.1234');
    });
  });

  describe('compactNumberWithUnit', () => {
    test('completes the decimal part with the correct amount of zeroes', () => {
      expect(formatNumber.compactNumberWithUnit('10')).toEqual('10.00');
      expect(formatNumber.compactNumberWithUnit('10', 3)).toEqual('10.000');
      expect(formatNumber.compactNumberWithUnit('0.23', 4)).toEqual('0.2300');
    });

    test('truncates decimals to the desired amount', async () => {
      expect(formatNumber.compactNumberWithUnit('100.123')).toEqual('100.12'); // 2 by default
      expect(formatNumber.compactNumberWithUnit('100.999')).toEqual('100.99');
      expect(formatNumber.compactNumberWithUnit('0.5009', 3)).toEqual('0.500');
      expect(formatNumber.compactNumberWithUnit('100.999', 0)).toEqual('100');
    });

    test('honors DEFAULT_DECIMALS and supports 1, 2, and 3 decimal places', () => {
      const value = '1234.56789';

      expect(formatNumber.compactNumberWithUnit(value)).toEqual('1,234.56');
      expect(
        formatNumber.compactNumberWithUnit(
          value,
          formatNumber.DEFAULT_DECIMALS,
        ),
      ).toEqual('1,234.56');
      expect(formatNumber.compactNumberWithUnit(value, 1)).toEqual('1,234.5');
      expect(formatNumber.compactNumberWithUnit(value, 3)).toEqual('1,234.567');
    });

    test('returns zero when the given value is not defined, an empty string or NaN', () => {
      expect(formatNumber.compactNumberWithUnit('')).toEqual('0.00');
      expect(formatNumber.compactNumberWithUnit('asd')).toEqual('0.00');
    });

    test('returns the compacted number with the corresponding decimals and unit when greater than one million', () => {
      expect(formatNumber.compactNumberWithUnit('1000000')).toEqual('1.00M');
      expect(formatNumber.compactNumberWithUnit('1000000000')).toEqual('1.00B');
      expect(formatNumber.compactNumberWithUnit('1000000000000')).toEqual(
        '1.00T',
      );
      expect(formatNumber.compactNumberWithUnit('1000000000000000')).toEqual(
        '1.00Q',
      );
    });

    test('allows abbreviation to start from thousands', () => {
      expect(
        formatNumber.compactNumberWithUnit(
          '1000',
          2,
          formatNumber.UnitThreshold.THOUSAND,
        ),
      ).toEqual('1.00K');
      expect(
        formatNumber.compactNumberWithUnit(
          '10000',
          2,
          formatNumber.UnitThreshold.THOUSAND,
        ),
      ).toEqual('10.00K');
      expect(
        formatNumber.compactNumberWithUnit(
          '999999',
          2,
          formatNumber.UnitThreshold.THOUSAND,
        ),
      ).toEqual('999.99K');
    });

    test('separates thousands with commas', () => {
      expect(formatNumber.compactNumberWithUnit('1000')).toEqual('1,000.00');
      expect(formatNumber.compactNumberWithUnit('10000')).toEqual('10,000.00');
      expect(formatNumber.compactNumberWithUnit('100000')).toEqual(
        '100,000.00',
      );
    });

    test('does not compact the number when it is less than one million by default', () => {
      expect(formatNumber.compactNumberWithUnit('100')).toEqual('100.00');
      expect(formatNumber.compactNumberWithUnit('1000')).toEqual('1,000.00');
      expect(formatNumber.compactNumberWithUnit('999999')).toEqual(
        '999,999.00',
      );
    });

    test('should compact the number to quadrillion when its order of magnitude is 18 or higher', () => {
      expect(formatNumber.compactNumberWithUnit('1000000000000000000')).toEqual(
        '1,000.00Q',
      );
      expect(
        formatNumber.compactNumberWithUnit('1000000000000000000000'),
      ).toEqual('1,000,000.00Q');
      expect(
        formatNumber.compactNumberWithUnit('1000000000000000000000000'),
      ).toEqual('1,000,000,000.00Q');
    });

    test('does not lose any significant digits for big numbers', () => {
      // Higher than the max Number for JS
      const bigNumber = '123456789012345678901234567890123456789';
      expect(formatNumber.compactNumberWithUnit(bigNumber)).toEqual(
        '123,456,789,012,345,678,901,234.56Q',
      );
    });
  });

  describe('formatAmountToLocale', () => {
    describe('basic conversion with decimals', () => {
      it('converts raw amount with 6 decimals correctly', () => {
        expect(formatNumber.formatAmountToLocale('18282139024', 6)).toEqual(
          '18,282.139024',
        );
      });

      it('converts round number with 6 decimals correctly', () => {
        expect(formatNumber.formatAmountToLocale('200000000', 6)).toEqual(
          '200',
        );
      });

      it('converts small amount with 6 decimals correctly', () => {
        expect(formatNumber.formatAmountToLocale('1000000', 6)).toEqual('1');
      });

      it('converts amount with trailing zeros in decimals', () => {
        expect(formatNumber.formatAmountToLocale('5500000', 6)).toEqual('5.5');
      });
    });

    describe('formatting with thousands separator', () => {
      it('uses comma as thousands separator', () => {
        expect(formatNumber.formatAmountToLocale('1234567890000', 6)).toEqual(
          '1,234,567.89',
        );
      });

      it('uses dot as decimal separator', () => {
        expect(formatNumber.formatAmountToLocale('1500000', 6)).toEqual('1.5');
      });

      it('formats large numbers with proper grouping', () => {
        expect(
          formatNumber.formatAmountToLocale('999999999999000000', 6),
        ).toEqual('999,999,999,999');
      });
    });

    describe('edge cases', () => {
      it('returns "0" for empty string', () => {
        expect(formatNumber.formatAmountToLocale('', 6)).toEqual('0');
      });

      it('returns "0" for whitespace string', () => {
        expect(formatNumber.formatAmountToLocale('   ', 6)).toEqual('0');
      });

      it('returns "0" for NaN input', () => {
        expect(formatNumber.formatAmountToLocale('not-a-number', 6)).toEqual(
          '0',
        );
      });

      it('handles zero amount', () => {
        expect(formatNumber.formatAmountToLocale('0', 6)).toEqual('0');
      });
    });

    describe('different decimal configurations', () => {
      it('handles 0 decimals (no conversion)', () => {
        expect(formatNumber.formatAmountToLocale('12345', 0)).toEqual('12,345');
      });

      it('handles 18 decimals (ETH-like)', () => {
        expect(
          formatNumber.formatAmountToLocale('1500000000000000000', 18),
        ).toEqual('1.5');
      });

      it('handles 8 decimals (BTC-like)', () => {
        expect(formatNumber.formatAmountToLocale('150000000', 8)).toEqual(
          '1.5',
        );
      });

      it('handles 2 decimals', () => {
        expect(formatNumber.formatAmountToLocale('12345', 2)).toEqual('123.45');
      });
    });

    describe('maxFractionDigits parameter', () => {
      it('limits decimal places when specified', () => {
        expect(formatNumber.formatAmountToLocale('1234567', 6, 2)).toEqual(
          '1.23',
        );
      });

      it('does not add extra zeros when maxFractionDigits is higher than actual decimals', () => {
        expect(formatNumber.formatAmountToLocale('1500000', 6, 10)).toEqual(
          '1.5',
        );
      });

      it('truncates (rounds down) when limiting decimals', () => {
        expect(formatNumber.formatAmountToLocale('1999999', 6, 2)).toEqual(
          '1.99',
        );
      });
    });

    describe('precision with large numbers', () => {
      it('handles very large raw amounts without precision loss', () => {
        expect(
          formatNumber.formatAmountToLocale('123456789012345678', 6),
        ).toEqual('123,456,789,012.345678');
      });

      it('handles amounts smaller than 1 unit', () => {
        expect(formatNumber.formatAmountToLocale('500000', 6)).toEqual('0.5');
      });

      it('handles very small fractional amounts', () => {
        expect(formatNumber.formatAmountToLocale('1', 6)).toEqual('0.000001');
      });
    });
  });

  describe('valueToLocale', () => {
    describe('basic formatting', () => {
      it('formats integer numbers with thousands separator', () => {
        expect(formatNumber.valueToLocale(1000)).toEqual('1,000');
        expect(formatNumber.valueToLocale(1000000)).toEqual('1,000,000');
        expect(formatNumber.valueToLocale(1234567890)).toEqual('1,234,567,890');
      });

      it('formats decimal numbers correctly', () => {
        expect(formatNumber.valueToLocale(1234.56)).toEqual('1,234.56');
        expect(formatNumber.valueToLocale(0.123456)).toEqual('0.123456');
      });

      it('accepts string input for arbitrary precision', () => {
        expect(formatNumber.valueToLocale('1234567890.123456789')).toEqual(
          '1,234,567,890.123456789',
        );
      });

      it('handles zero', () => {
        expect(formatNumber.valueToLocale(0)).toEqual('0');
        expect(formatNumber.valueToLocale('0')).toEqual('0');
      });

      it('handles negative numbers', () => {
        expect(formatNumber.valueToLocale(-1234.56)).toEqual('-1,234.56');
        expect(formatNumber.valueToLocale('-1000000')).toEqual('-1,000,000');
      });
    });

    describe('minimumFractionDigits parameter', () => {
      it('pads with zeros when value has fewer decimals', () => {
        expect(formatNumber.valueToLocale(100, 2)).toEqual('100.00');
        expect(formatNumber.valueToLocale(100.5, 3)).toEqual('100.500');
        expect(formatNumber.valueToLocale('1000', 4)).toEqual('1,000.0000');
      });

      it('does not truncate when value has more decimals than minimum', () => {
        expect(formatNumber.valueToLocale(100.12345, 2)).toEqual('100.12345');
      });
    });

    describe('maximumFractionDigits parameter', () => {
      it('truncates (rounds down) when value has more decimals than maximum', () => {
        expect(formatNumber.valueToLocale(1.999, 0, 2)).toEqual('1.99');
        expect(formatNumber.valueToLocale(1.999999, 0, 4)).toEqual('1.9999');
        expect(formatNumber.valueToLocale('123.456789', 0, 3)).toEqual(
          '123.456',
        );
      });

      it('does not round up at .5', () => {
        expect(formatNumber.valueToLocale(1.55, 0, 1)).toEqual('1.5');
        expect(formatNumber.valueToLocale(1.95, 0, 1)).toEqual('1.9');
      });
    });

    describe('combined min and max fraction digits', () => {
      it('respects both minimum and maximum', () => {
        expect(formatNumber.valueToLocale(100, 2, 4)).toEqual('100.00');
        expect(formatNumber.valueToLocale(100.123456, 2, 4)).toEqual(
          '100.1234',
        );
        expect(formatNumber.valueToLocale(100.12, 2, 4)).toEqual('100.12');
      });
    });

    describe('edge cases', () => {
      it('returns "0" for NaN input', () => {
        expect(formatNumber.valueToLocale(NaN)).toEqual('0');
        expect(formatNumber.valueToLocale('not-a-number')).toEqual('0');
      });

      it('handles very small numbers', () => {
        expect(formatNumber.valueToLocale(0.000001)).toEqual('0.000001');
        expect(formatNumber.valueToLocale('0.00000001')).toEqual('0.00000001');
      });
    });

    describe('precision with large numbers', () => {
      it('handles numbers beyond JavaScript safe integer limit', () => {
        // JavaScript Number.MAX_SAFE_INTEGER is 9007199254740991
        expect(formatNumber.valueToLocale('12345678901234567890')).toEqual(
          '12,345,678,901,234,567,890',
        );
      });

      it('preserves decimal precision for large numbers', () => {
        expect(
          formatNumber.valueToLocale('123456789012345678.123456789'),
        ).toEqual('123,456,789,012,345,678.123456789');
      });
    });

    describe('consistent formatting across locales', () => {
      it('always uses comma as thousands separator', () => {
        expect(formatNumber.valueToLocale(1000000.5)).toEqual('1,000,000.5');
      });

      it('always uses dot as decimal separator', () => {
        expect(formatNumber.valueToLocale(1234.5678)).toEqual('1,234.5678');
      });
    });
  });

  describe('getLocaleSeparators', () => {
    describe('returns correct separators for specific locales', () => {
      it('returns comma as group separator and dot as decimal for en-US', () => {
        const result = formatNumber.getLocaleSeparators('en-US');
        expect(result.groupSeparator).toEqual(',');
        expect(result.decimalSeparator).toEqual('.');
      });

      it('returns dot as group separator and comma as decimal for de-DE', () => {
        const result = formatNumber.getLocaleSeparators('de-DE');
        expect(result.groupSeparator).toEqual('.');
        expect(result.decimalSeparator).toEqual(',');
      });

      it('returns space as group separator and comma as decimal for fr-FR', () => {
        const result = formatNumber.getLocaleSeparators('fr-FR');
        // French uses non-breaking space (or narrow no-break space) as group separator
        expect(result.groupSeparator).toMatch(/[\s\u00A0\u202F]/);
        expect(result.decimalSeparator).toEqual(',');
      });

      it('returns comma as group separator and dot as decimal for en-GB', () => {
        const result = formatNumber.getLocaleSeparators('en-GB');
        expect(result.groupSeparator).toEqual(',');
        expect(result.decimalSeparator).toEqual('.');
      });
    });

    describe('structure and type', () => {
      it('returns an object with groupSeparator and decimalSeparator properties', () => {
        const result = formatNumber.getLocaleSeparators('en-US');
        expect(result).toHaveProperty('groupSeparator');
        expect(result).toHaveProperty('decimalSeparator');
        expect(typeof result.groupSeparator).toBe('string');
        expect(typeof result.decimalSeparator).toBe('string');
      });

      it('returns non-empty strings for separators', () => {
        const result = formatNumber.getLocaleSeparators('en-US');
        expect(result.groupSeparator.length).toBeGreaterThan(0);
        expect(result.decimalSeparator.length).toBeGreaterThan(0);
      });
    });

    describe('caching behavior', () => {
      it('returns the same result for repeated calls with the same locale', () => {
        const result1 = formatNumber.getLocaleSeparators('en-US');
        const result2 = formatNumber.getLocaleSeparators('en-US');
        expect(result1).toBe(result2); // Same reference (cached)
      });

      it('returns the same result for repeated calls with undefined locale', () => {
        const result1 = formatNumber.getLocaleSeparators();
        const result2 = formatNumber.getLocaleSeparators();
        expect(result1).toBe(result2); // Same reference (cached)
      });
    });

    describe('default locale handling', () => {
      it('returns valid separators when no locale is specified', () => {
        const result = formatNumber.getLocaleSeparators();
        expect(result.groupSeparator).toBeDefined();
        expect(result.decimalSeparator).toBeDefined();
        expect(result.groupSeparator).not.toEqual('');
        expect(result.decimalSeparator).not.toEqual('');
      });

      it('returns valid separators when undefined is passed', () => {
        const result = formatNumber.getLocaleSeparators(undefined);
        expect(result.groupSeparator).toBeDefined();
        expect(result.decimalSeparator).toBeDefined();
      });
    });
  });
});
