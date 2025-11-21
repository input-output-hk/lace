/* eslint-disable no-magic-numbers */
import '@testing-library/jest-dom';
import * as formatNumber from '../format-number';

describe('format-number utils', () => {
  describe('shortenNumber', () => {
    test('shortens a number string to the new desired length', () => {
      expect(formatNumber.shortenNumber('1234', 2)).toEqual('12');
    });

    test('returns the same string if the new length is equal or greater than the string length', () => {
      expect(formatNumber.shortenNumber('1234', 4)).toEqual('1234');
      expect(formatNumber.shortenNumber('123', 4)).toEqual('123');
    });

    test('ignores negative values or zero as the new length', () => {
      expect(formatNumber.shortenNumber('12345', -2)).toEqual('12345');
      expect(formatNumber.shortenNumber('12345', 0)).toEqual('12345');
    });
  });

  describe('isNumeric', () => {
    test('returns false if the string is not a valid number', () => {
      expect(formatNumber.isNumeric('asd')).toEqual(false);
      expect(formatNumber.isNumeric('')).toEqual(false);
      expect(formatNumber.isNumeric('11a')).toEqual(false);
      expect(formatNumber.isNumeric('111.123t')).toEqual(false);
      expect(formatNumber.isNumeric('111.123.123')).toEqual(false);
      expect(formatNumber.isNumeric('200,000')).toEqual(false);
    });
    test('returns true if the string is a valid number', () => {
      expect(formatNumber.isNumeric('200')).toEqual(true);
      expect(formatNumber.isNumeric('-200')).toEqual(true);
      expect(formatNumber.isNumeric('111.123')).toEqual(true);
      expect(formatNumber.isNumeric('5e6')).toEqual(true); // 5_000_000
    });
  });

  describe('formatLocaleNumber', () => {
    test('uses "." to separate decimals and "," to separate groups of 3 digits', () => {
      expect(formatNumber.formatLocaleNumber('1000000.55', 2)).toEqual('1,000,000.55');
    });
    describe('formats the number with the desired amount of decimals', () => {
      test('rounds number to 0 if the original value has more decimals than desired', () => {
        expect(formatNumber.formatLocaleNumber('999.99', 1)).toEqual('999.9'); // does not round up
        expect(formatNumber.formatLocaleNumber('999.44', 1)).toEqual('999.4');
      });
      test('fills with zeroes if the amount of desired decimals is greater than in the original value', () => {
        expect(formatNumber.formatLocaleNumber('999.999', 4)).toEqual('999.9990');
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

    test('returns zero when the given value is not defined, an empty string or NaN', () => {
      expect(formatNumber.compactNumberWithUnit('')).toEqual('0.00');
      // eslint-disable-next-line unicorn/no-useless-undefined
      expect(formatNumber.compactNumberWithUnit(undefined)).toEqual('0.00');
      expect(formatNumber.compactNumberWithUnit('asd')).toEqual('0.00');
    });

    test('returns the compacted number with the corresponding decimals and unit when greater than one million', () => {
      expect(formatNumber.compactNumberWithUnit('1000000')).toEqual('1.00M');
      expect(formatNumber.compactNumberWithUnit('1000000000')).toEqual('1.00B');
      expect(formatNumber.compactNumberWithUnit('1000000000000')).toEqual('1.00T');
      expect(formatNumber.compactNumberWithUnit('1000000000000000')).toEqual('1.00Q');
    });

    test('separates thousands with commas', () => {
      expect(formatNumber.compactNumberWithUnit('1000')).toEqual('1,000.00');
      expect(formatNumber.compactNumberWithUnit('10000')).toEqual('10,000.00');
      expect(formatNumber.compactNumberWithUnit('100000')).toEqual('100,000.00');
    });

    test('does not compact the number when it is less than one million', () => {
      expect(formatNumber.compactNumberWithUnit('100')).toEqual('100.00');
      expect(formatNumber.compactNumberWithUnit('1000')).toEqual('1,000.00');
      expect(formatNumber.compactNumberWithUnit('999999')).toEqual('999,999.00');
    });
    test('should compact the number to quadrillion when its order of magnitude is 18 or higher', () => {
      expect(formatNumber.compactNumberWithUnit(1e18)).toEqual('1,000.00Q');
      expect(formatNumber.compactNumberWithUnit(1e21)).toEqual('1,000,000.00Q');
      expect(formatNumber.compactNumberWithUnit(1e24)).toEqual('1,000,000,000.00Q');
    });

    test('does not lose any significant digits for big numbers', () => {
      // Higher than the max Number for JS
      const bigNumber = '123456789012345678901234567890123456789';
      expect(formatNumber.compactNumberWithUnit(bigNumber)).toEqual('123,456,789,012,345,678,901,234.56Q');
      // Number() loses significant digits after the 18th one
      expect(formatNumber.compactNumberWithUnit(Number(bigNumber))).toEqual('123,456,789,012,345,680,000,000.00Q');
    });
  });

  describe('formatNumberForDisplay', () => {
    test('returns zero if value is undefined, an empty string or there are no digits', () => {
      expect(formatNumber.formatNumberForDisplay('')).toEqual('0');
      expect(formatNumber.formatNumberForDisplay('no numbers')).toEqual('0');
      // eslint-disable-next-line unicorn/no-useless-undefined
      expect(formatNumber.formatNumberForDisplay(undefined)).toEqual('0');
    });
    describe('removes non-number digits except dots from the number string before formatting', () => {
      test('formats a string with no dots or decimal parts', () => {
        expect(formatNumber.formatNumberForDisplay('a1b2c3d4e5f6')).toEqual('123,456');
        expect(formatNumber.formatNumberForDisplay('123456')).toEqual('123,456');
        expect(formatNumber.formatNumberForDisplay('123')).toEqual('123');
        expect(formatNumber.formatNumberForDisplay('abc')).toEqual('0');
      });
      test('only returns the integer part when a string with one or more dots and no max decimals are provided', () => {
        // default max decimals = 0
        expect(formatNumber.formatNumberForDisplay('123.abc')).toEqual('123');
        expect(formatNumber.formatNumberForDisplay('abc.1234')).toEqual('0');
        expect(formatNumber.formatNumberForDisplay('abc.def')).toEqual('0');
        expect(formatNumber.formatNumberForDisplay('1a2b3.c4d56e')).toEqual('123');
        expect(formatNumber.formatNumberForDisplay('1a2b3.c4d56e.f78g')).toEqual('123');
      });
      test('returns the whole formatted number when a string with one dot and max decimals > 0 are provided', () => {
        // No numbers in decimal part -> Formats the integer part, keeps the dot and leaves the decimal part empty
        expect(formatNumber.formatNumberForDisplay('123.abc', 3)).toEqual('123.');
        // No numbers in integer part -> Replaces the integer part with 0, keeps the dot and formats the decimals
        expect(formatNumber.formatNumberForDisplay('abc.1234', 3)).toEqual('0.123');
        // Previous cases combined -> Replaces the integer part with 0, keeps the dot and leaves the decimal part empty
        expect(formatNumber.formatNumberForDisplay('abc.def', 2)).toEqual('0.');
        // Formats both parts
        expect(formatNumber.formatNumberForDisplay('1a2b3.c4d56e', 2)).toEqual('123.45');
      });
      test('removes all extra dots when a string with more than one dot is provided', () => {
        expect(formatNumber.formatNumberForDisplay('1.234.567', 6)).toEqual('1.234567');
        expect(formatNumber.formatNumberForDisplay('1a2b3.c4d56e.f78g', 5)).toEqual('123.45678');
        // Shortens the decimal part
        expect(formatNumber.formatNumberForDisplay('123.456.789', 5)).toEqual('123.45678');
        expect(formatNumber.formatNumberForDisplay('1.2.3.4.5.6.7', 4)).toEqual('1.2345');
      });
    });
  });

  describe('handleFormattedValueChange', () => {
    test(
      'if the difference between the new and the old formatted value is just one comma ' +
        'then returns the value without the number before the comma and -1 as character offset',
      () => {
        expect(
          formatNumber.handleFormattedValueChange({
            newFormattedValue: '123456,789',
            previousFormattedValue: '123,456,789'
          })
        ).toEqual({ formattedValue: '12,456,789', value: '12456789', characterOffset: -1 });
      }
    );

    test(
      'if there is no difference between the new and the old formatted value ' +
        'then returns the new value formatted and zero as character offset',
      () => {
        expect(
          formatNumber.handleFormattedValueChange({
            newFormattedValue: '123,456,789',
            previousFormattedValue: '123,456,789'
          })
        ).toEqual({ formattedValue: '123,456,789', value: '123456789', characterOffset: 0 });
      }
    );

    test(
      'if the difference between the new and the old formatted value is not just one comma ' +
        'then returns the new value formatted and the difference in length between formatted values as offset',
      () => {
        expect(
          formatNumber.handleFormattedValueChange({
            newFormattedValue: '123,56,789', // missing a number (4)
            previousFormattedValue: '123,456,789'
          })
        ).toEqual({ formattedValue: '12,356,789', value: '12356789', characterOffset: 0 });

        expect(
          formatNumber.handleFormattedValueChange({
            newFormattedValue: '123456789', // missing both commas
            previousFormattedValue: '123,456,789'
          })
        ).toEqual({ formattedValue: '123,456,789', value: '123456789', characterOffset: 2 });

        expect(
          formatNumber.handleFormattedValueChange({
            newFormattedValue: '123456,78', // missing a comma and a number (9)
            previousFormattedValue: '123,456,789'
          })
        ).toEqual({ formattedValue: '12,345,678', value: '12345678', characterOffset: 1 });
      }
    );

    test('when comma deletion occurs at index 0 returns the new value formatted and 0 as the new cursor position', () => {
      expect(
        formatNumber.handleFormattedValueChange({ newFormattedValue: '123,456', previousFormattedValue: ',123,456' })
      ).toEqual({ formattedValue: '123,456', value: '123456', characterOffset: 0 });
    });

    test('works properly if one of the values or both are empty strings', () => {
      expect(
        formatNumber.handleFormattedValueChange({ newFormattedValue: '', previousFormattedValue: '123,456,789' })
      ).toEqual({ formattedValue: '', value: '', characterOffset: 0 });

      expect(
        formatNumber.handleFormattedValueChange({ newFormattedValue: '123,456,789', previousFormattedValue: '' })
      ).toEqual({ formattedValue: '123,456,789', value: '123456789', characterOffset: 0 });

      expect(formatNumber.handleFormattedValueChange({ newFormattedValue: '', previousFormattedValue: '' })).toEqual({
        formattedValue: '',
        value: '',
        characterOffset: 0
      });

      // Old value is just a comma, new value is an empty string. Deletes comma and returns 0 as character offset
      expect(formatNumber.handleFormattedValueChange({ newFormattedValue: '', previousFormattedValue: ',' })).toEqual({
        formattedValue: '',
        value: '',
        characterOffset: 0
      });
    });
  });
});
