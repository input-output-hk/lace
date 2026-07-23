import { describe, expect, it } from 'vitest';

import { computeUnlockBackoffMs } from '../../src/store/unlock-backoff';

describe('computeUnlockBackoffMs (L-201)', () => {
  it('is zero for the first attempt (no prior failures)', () => {
    expect(computeUnlockBackoffMs(0)).toBe(0);
  });

  it('clamps non-positive inputs to zero', () => {
    expect(computeUnlockBackoffMs(-5)).toBe(0);
  });

  it('grows exponentially from 1s', () => {
    expect(computeUnlockBackoffMs(1)).toBe(1000);
    expect(computeUnlockBackoffMs(2)).toBe(2000);
    expect(computeUnlockBackoffMs(3)).toBe(4000);
    expect(computeUnlockBackoffMs(4)).toBe(8000);
  });

  it('caps at 60s', () => {
    // 2^6 = 64s would exceed the cap.
    expect(computeUnlockBackoffMs(7)).toBe(60_000);
    expect(computeUnlockBackoffMs(50)).toBe(60_000);
  });
});
