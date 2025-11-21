/* eslint-disable no-magic-numbers */
import { formatPercentages, getNumberWithUnit } from '../format-number';

describe('Number formatters', () => {
  describe('formatPercentages', () => {
    test('scales decimal to percentage', () => {
      expect(formatPercentages(1)).toEqual('100.00');
    });
    test('rounds percentages up to two decimals by default', () => {
      expect(formatPercentages(0.333_39)).toEqual('33.34');
    });
    test('rounds percentages down', () => {
      expect(formatPercentages(0.339, { decimalPlaces: 0, rounding: 'down' })).toEqual('33');
    });
    test('rounds percentages up', () => {
      expect(formatPercentages(0.339, { decimalPlaces: 0, rounding: 'halfUp' })).toEqual('34');
    });
    test('formats percentages with many decimals', () => {
      expect(formatPercentages(0.339, { decimalPlaces: 6, rounding: 'down' })).toEqual('33.900000');
    });
  });
});

describe('getNumberWithUnit', () => {
  test('formats a number rounding up to 2 decimal places according to its unit', () => {
    expect(getNumberWithUnit('10234')).toEqual({ number: '10.23', unit: 'K' });
    expect(getNumberWithUnit('10235')).toEqual({ number: '10.24', unit: 'K' });
    expect(getNumberWithUnit('10235000')).toEqual({ number: '10.24', unit: 'M' });
    expect(getNumberWithUnit('10235000000')).toEqual({ number: '10.24', unit: 'B' });
    expect(getNumberWithUnit('10235000000000')).toEqual({ number: '10.24', unit: 'T' });
    expect(getNumberWithUnit('10235000000000000')).toEqual({ number: '10.24', unit: 'Q' });
  });

  test(
    'formats a number rounding up to 2 decimal places and returns an empty string as the unit ' +
      'when the number is less than 1000',
    () => {
      expect(getNumberWithUnit('999')).toEqual({ number: '999', unit: '' });
      expect(getNumberWithUnit('999.99')).toEqual({ number: '999.99', unit: '' });
      expect(getNumberWithUnit('999.991')).toEqual({ number: '999.99', unit: '' });
      expect(getNumberWithUnit('999.999')).toEqual({ number: '1000', unit: '' });
    }
  );

  test('returns the same value and empty string as the unit in case of a NaN value', () => {
    expect(getNumberWithUnit('asd')).toEqual({ number: 'asd', unit: '' });
  });

  test('formats negatives and decimal values', () => {
    expect(getNumberWithUnit('-912180')).toEqual({ number: '-912.18', unit: 'K' });
    expect(getNumberWithUnit('123452.2222')).toEqual({ number: '123.45', unit: 'K' });
    expect(getNumberWithUnit('123455.5555')).toEqual({ number: '123.46', unit: 'K' });
  });

  test('removes any leading or trailing zeroes while formatting', () => {
    expect(getNumberWithUnit('0000010234')).toEqual({ number: '10.23', unit: 'K' });
    expect(getNumberWithUnit('1000.00000')).toEqual({ number: '1', unit: 'K' });
  });
});
