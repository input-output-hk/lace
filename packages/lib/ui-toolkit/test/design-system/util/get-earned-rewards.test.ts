import { describe, expect, it } from 'vitest';

import { getEarnedRewards } from '../../../src/design-system/util/get-earned-rewards';

describe('getEarnedRewards', () => {
  it('is true for a grouped amount whatever the separators are', () => {
    expect(getEarnedRewards('1,234.57 ADA')).toBe(true);
    expect(getEarnedRewards('1.234,57 ADA')).toBe(true);
    expect(getEarnedRewards("1'234.57 ADA")).toBe(true);
    expect(getEarnedRewards('12,34,567.89 ADA')).toBe(true);
  });

  it('is true for an amount below one unit', () => {
    expect(getEarnedRewards('0.000001 ADA')).toBe(true);
    expect(getEarnedRewards('0,000001 ADA')).toBe(true);
  });

  it('is false for zero', () => {
    expect(getEarnedRewards('0 ADA')).toBe(false);
    expect(getEarnedRewards('0.00 ADA')).toBe(false);
    expect(getEarnedRewards('0,00 ADA')).toBe(false);
  });

  it('is false for an empty amount', () => {
    expect(getEarnedRewards('')).toBe(false);
  });
});
