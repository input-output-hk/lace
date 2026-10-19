import { describe, expect, it } from 'vitest';

import {
  formatYieldEarnedFiat,
  sumYieldEarnedBaseUnits,
} from '../src/yield-earned-display';

describe('formatYieldEarnedFiat', () => {
  it('shows a cent or more to 2 decimals, truncated like other fiat amounts', () => {
    expect(formatYieldEarnedFiat(1234.567)).toBe('1,234.56');
    expect(formatYieldEarnedFiat(0.01)).toBe('0.01');
  });

  it('shows a sub-cent yield to 2 significant figures, truncated', () => {
    expect(formatYieldEarnedFiat(0.003584)).toBe('0.0035');
    expect(formatYieldEarnedFiat(0.000_012_34)).toBe('0.000012');
    expect(formatYieldEarnedFiat(0.009_96)).toBe('0.0099');
  });

  it('shows zero to 2 decimals', () => {
    expect(formatYieldEarnedFiat(0)).toBe('0.00');
  });
});

describe('sumYieldEarnedBaseUnits', () => {
  it('sums only the given accounts and treats unread ones as zero', () => {
    const byAccount = {
      'acc-mainnet-0': { yieldUsdrBaseUnits: '3565' },
      'acc-mainnet-1': { yieldUsdrBaseUnits: '-65' },
      'acc-preprod-0': { yieldUsdrBaseUnits: '999999' },
    };
    expect(
      sumYieldEarnedBaseUnits(
        ['acc-mainnet-0', 'acc-mainnet-1', 'acc-never-read'],
        byAccount,
      ),
    ).toBe(3500n);
  });
});
