import { describe, expect, it } from 'vitest';

import { formatStakingApy } from '../src/format-staking-apy';

describe('formatStakingApy', () => {
  it.each([
    [0.08321, '8.3%'],
    [0, '0.0%'],
    [-0.01, '-1.0%'],
    [undefined, undefined],
    [null, undefined],
    [NaN, undefined],
    [Infinity, undefined],
  ])('formats %s consistently for both staking screens', (apy, expected) => {
    expect(formatStakingApy(apy)).toBe(expected);
  });
});
