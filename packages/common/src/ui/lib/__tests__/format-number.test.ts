/* eslint-disable no-magic-numbers */
import { formatPercentages } from '../format-number';

describe('Number formatters', () => {
  describe('getCapitalizedInitial', () => {
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
      expect(formatPercentages(0.339, { decimalPlaces: 0, rounding: 'half_up' })).toEqual('34');
    });
    test('formats percentages with many decimals', () => {
      expect(formatPercentages(0.339, { decimalPlaces: 6, rounding: 'down' })).toEqual('33.900000');
    });
  });
});
