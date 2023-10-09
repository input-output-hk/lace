/* eslint-disable no-magic-numbers */
import { sumPercentagesSanitized } from '../sumPercentagesSanitized';

const key = 'value';

describe('Testing sumPercentagesSanitized function', () => {
  for (let i = 1; i < 10; i++) {
    test(`sums 100/${i} percentage fractions`, () => {
      expect(sumPercentagesSanitized({ items: Array.from({ length: i }, () => ({ value: 100 / i })), key })).toEqual(
        100
      );
    });
  }

  test('tests JS edge-case #1', () => {
    expect(sumPercentagesSanitized({ items: [{ value: 1.380_000_000_45 }], key })).toEqual(1.380_000_000_5);
  });
});
