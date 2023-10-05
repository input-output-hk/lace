/* eslint-disable no-magic-numbers */
import { sumPercentagesLossless } from '../sumPercentagesLossless';

const key = 'value';

describe('Testing sumPercentagesLossless function', () => {
  for (let i = 1; i < 10; i++) {
    test('Should correctly sum percentage fractions', () => {
      expect(sumPercentagesLossless({ items: Array.from({ length: i }, () => ({ value: 100 / i })), key })).toEqual(
        100
      );
    });
  }
});
