import { describe, expect, it } from 'vitest';

import { computeSyncRatio } from '../../src/store/compute-sync-ratio';

describe('computeSyncRatio', () => {
  it('does not invent a percentage before the target is known', () => {
    for (const applied of [0n, 1000n, 3413n, 100000n]) {
      expect(computeSyncRatio(applied, 0n)).toBeUndefined();
    }
  });
  it('uses SDK completion for an empty stream', () => {
    expect(computeSyncRatio(0n, 0n, true)).toBe(1);
    expect(computeSyncRatio(1000n, 0n, true)).toBeUndefined();
  });
  it.each([
    [0n, 100n, 0],
    [50n, 100n, 0.5],
    [100n, 100n, 1],
    [150n, 100n, 1],
    [999999999n, 1000000000n, 0.999999999],
  ])('reports cursor progress for %s / %s', (applied, target, expected) => {
    expect(computeSyncRatio(applied, target)).toBeCloseTo(expected, 9);
  });
  it('leaves invalid counters indeterminate', () => {
    expect(computeSyncRatio(-1n, 100n)).toBeUndefined();
    expect(computeSyncRatio(0n, -1n)).toBeUndefined();
  });
});
