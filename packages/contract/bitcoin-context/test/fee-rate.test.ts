import { describe, expect, it } from 'vitest';

import { feeRateFromSatsPerVByte } from '../src/fee-rate';

describe('feeRateFromSatsPerVByte', () => {
  it('converts sat/vB to BTC per kilobyte', () => {
    expect(feeRateFromSatsPerVByte(1)).toBe(0.00001);
    expect(feeRateFromSatsPerVByte(10)).toBe(0.0001);
    expect(feeRateFromSatsPerVByte(12.5)).toBe(0.000125);
  });

  it('refuses a rate that is not a positive finite number', () => {
    expect(feeRateFromSatsPerVByte(0)).toBeUndefined();
    expect(feeRateFromSatsPerVByte(-1)).toBeUndefined();
    expect(feeRateFromSatsPerVByte(Number.NaN)).toBeUndefined();
    expect(feeRateFromSatsPerVByte(Number.POSITIVE_INFINITY)).toBeUndefined();
  });

  it('refuses a rate above the sat/vB ceiling but accepts the ceiling itself', () => {
    expect(feeRateFromSatsPerVByte(10_000)).toBe(0.1);
    expect(feeRateFromSatsPerVByte(10_001)).toBeUndefined();
  });
});
