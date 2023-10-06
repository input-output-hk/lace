/* eslint-disable no-magic-numbers */
import { normalizePercentages } from '../normalizePercentages';

const thirds = [{ value: 100 / 3 }, { value: 100 / 3 }, { value: 100 / 3 }];
const sevenths = Array.from({ length: 7 }, () => ({ value: 100 / 7 }));
const key = 'value';

describe('Testing normalizePercentages function', () => {
  test('correctly normalizes numbers to 0 decimal places', () => {
    expect(normalizePercentages({ decimals: 0, items: thirds, key })).toEqual([
      { value: 34 },
      { value: 33 },
      { value: 33 },
    ]);
  });

  test('correctly normalizes numbers to 1 decimal places', () => {
    expect(normalizePercentages({ decimals: 1, items: thirds, key })).toEqual([
      { value: 33.4 },
      { value: 33.3 },
      { value: 33.3 },
    ]);
  });

  test('correctly normalizes numbers to 2 decimal places', () => {
    expect(normalizePercentages({ decimals: 2, items: thirds, key })).toEqual([
      { value: 33.34 },
      { value: 33.33 },
      { value: 33.33 },
    ]);
  });

  test('correctly normalizes more numbers to 2 decimal places', () => {
    expect(normalizePercentages({ decimals: 2, items: sevenths, key })).toEqual([
      { value: 14.28 },
      { value: 14.28 },
      { value: 14.28 },
      { value: 14.29 },
      { value: 14.29 },
      { value: 14.29 },
      { value: 14.29 },
    ]);
  });

  test('throws on incorrect input sum', () => {
    expect(() => normalizePercentages({ decimals: 2, items: [...thirds, { value: 1 }], key })).toThrow(
      new Error('Percentages must sum to 100')
    );
  });
});
