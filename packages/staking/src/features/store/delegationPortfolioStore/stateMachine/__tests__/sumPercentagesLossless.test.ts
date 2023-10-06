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

  test('Test JS edge-case #1', () => {
    expect(sumPercentagesLossless({ items: [{ value: 1.380_000_000_45 }], key })).toEqual(1.380_000_000_5);
  });
});
