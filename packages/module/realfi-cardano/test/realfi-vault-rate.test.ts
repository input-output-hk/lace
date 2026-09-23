import { describe, expect, it } from 'vitest';

import {
  susdrOutForUsdr,
  usdrOutForSusdr,
  vaultRateNumbers,
} from '../src/realfi-vault-rate';

describe('realfi-vault-rate', () => {
  // ratio = 1.05 USDr per sUSDr, scaled 1e6
  const ratio = 1_050_000n;

  it('converts USDr→sUSDr at the vault rate', () => {
    // 1_050_000 USDr base units → 1_000_000 sUSDr
    expect(susdrOutForUsdr(1_050_000n, ratio)).toBe(1_000_000n);
  });

  it('converts sUSDr→USDr at the vault rate', () => {
    expect(usdrOutForSusdr(1_000_000n, ratio)).toBe(1_050_000n);
  });

  it('derives display rates', () => {
    expect(vaultRateNumbers(ratio)).toEqual({
      usdrPerSusdr: 1.05,
      susdrPerUsdr: 1 / 1.05,
    });
  });
});
