import { describe, expect, it } from 'vitest';

import { stakingCenterProductCardAddonContract } from '../src';

describe('@lace-contract/staking-center addon surface', () => {
  it('exposes the product-card addon contract for contributors (e.g. RealFi)', () => {
    expect(stakingCenterProductCardAddonContract.contractType).toBe('addon');
    expect(stakingCenterProductCardAddonContract.instance).toBe('zero-or-more');
    const { provides } = stakingCenterProductCardAddonContract as {
      provides: { addons: string[] };
    };
    expect(provides.addons).toContain('loadStakingCenterProductCard');
  });
});
