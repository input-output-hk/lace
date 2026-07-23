import { describe, expect, it } from 'vitest';

import {
  padCoalesce,
  partition,
  reduceTokenQuantities,
} from '../../../src/input-selection/round-robin-random/distribution';

const sum = (quantities: readonly bigint[]): bigint =>
  quantities.reduce((total, quantity) => total + quantity, 0n);

describe('partition', () => {
  it('preserves the sum and proportions', () => {
    const parts = partition(100n, [1n, 2n, 3n, 4n]);
    expect(parts).toEqual([10n, 20n, 30n, 40n]);
    expect(sum(parts)).toBe(100n);
  });

  it('distributes remainders to the largest fractions first', () => {
    const parts = partition(5n, [1n, 2n, 3n]);
    expect(parts).toEqual([1n, 2n, 2n]);
  });

  it('spreads a remainder over equal weights one unit at a time', () => {
    const parts = partition(10n, [1n, 1n, 1n]);
    expect(sum(parts)).toBe(10n);
    const sorted = [...parts].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(sorted[2] - sorted[0]).toBeLessThanOrEqual(1n);
  });

  it('breaks remainder ties by the larger integral part', () => {
    expect(partition(2n, [1n, 3n])).toEqual([0n, 2n]);
  });

  it('breaks full ties by earlier position', () => {
    expect(partition(10n, [1n, 1n, 1n])).toEqual([4n, 3n, 3n]);
  });

  it('preserves the sum with values beyond the 64-bit range of the reference', () => {
    const target = 45_000_000_000_000_000n;
    const parts = partition(target, [4_027_026_466n, 999_999_999_999n, 1n]);
    expect(sum(parts)).toBe(target);
  });

  it('assigns nothing to zero weights', () => {
    expect(partition(9n, [0n, 3n, 0n])).toEqual([0n, 9n, 0n]);
  });

  it('throws when all weights are zero', () => {
    expect(() => partition(10n, [0n, 0n])).toThrow('positive total weight');
  });

  it('matches the reference vectors for coin distribution', () => {
    expect(partition(1n, [1n])).toEqual([1n]);
    expect(partition(12n, [1n, 2n, 3n])).toEqual([2n, 4n, 6n]);
    expect(partition(5n, [1n, 2n, 3n])).toEqual([1n, 2n, 2n]);
  });

  it('matches the reference vectors for user-specified assets', () => {
    expect(partition(3n, [1n])).toEqual([3n]);
    expect(partition(3n, [1n, 2n])).toEqual([1n, 2n]);
  });
});

describe('padCoalesce', () => {
  it('pads short lists with zeros at the front', () => {
    expect(padCoalesce([1n], 4)).toEqual([0n, 0n, 0n, 1n]);
  });

  it('returns the sorted list unchanged when the length already matches', () => {
    expect(padCoalesce([5n, 2n], 2)).toEqual([2n, 5n]);
  });

  it('coalesces the two smallest quantities while too long', () => {
    expect(padCoalesce([8n, 4n, 2n, 1n], 3)).toEqual([3n, 4n, 8n]);
    expect(padCoalesce([8n, 4n, 2n, 1n], 2)).toEqual([7n, 8n]);
    expect(padCoalesce([8n, 4n, 2n, 1n], 1)).toEqual([15n]);
  });

  it('preserves the sum', () => {
    const quantities = [7n, 3n, 11n, 2n, 5n];
    for (const targetSize of [1, 2, 3, 4, 5, 6, 7]) {
      const result = padCoalesce(quantities, targetSize);
      expect(result).toHaveLength(targetSize);
      expect(sum(result)).toBe(sum(quantities));
    }
  });

  it('returns quantities in ascending order', () => {
    const result = padCoalesce([9n, 1n, 8n, 2n, 7n, 3n, 6n, 4n, 5n], 4);
    for (let index = 1; index < result.length; index++) {
      expect(result[index] >= result[index - 1]).toBe(true);
    }
  });

  it('matches the reference vectors for non-user-specified assets', () => {
    expect(padCoalesce([1n, 1n], 2)).toEqual([1n, 1n]);
    expect(padCoalesce([1n, 1n, 1n], 2)).toEqual([1n, 2n]);
    expect(padCoalesce([1n], 2)).toEqual([0n, 1n]);
  });
});

describe('reduceTokenQuantities', () => {
  it('reduces from the smallest quantities first', () => {
    expect(reduceTokenQuantities(4n, [0n, 1n, 2n, 3n, 4n])).toEqual([
      0n,
      0n,
      0n,
      2n,
      4n,
    ]);
  });

  it('reduces the total by exactly the reduction target', () => {
    const quantities = [1n, 2n, 3n, 4n];
    const reduced = reduceTokenQuantities(6n, quantities);
    expect(sum(reduced)).toBe(sum(quantities) - 6n);
  });

  it('zeroes everything when the target exceeds the total', () => {
    expect(reduceTokenQuantities(100n, [1n, 2n, 3n])).toEqual([0n, 0n, 0n]);
  });

  it('preserves length and order and does not mutate the input', () => {
    const quantities = [1n, 2n, 3n];
    const reduced = reduceTokenQuantities(2n, quantities);
    expect(reduced).toHaveLength(3);
    expect(reduced).toEqual([0n, 1n, 3n]);
    expect(quantities).toEqual([1n, 2n, 3n]);
  });

  it('returns the input unchanged for a zero target', () => {
    expect(reduceTokenQuantities(0n, [1n, 2n])).toEqual([1n, 2n]);
  });
});
