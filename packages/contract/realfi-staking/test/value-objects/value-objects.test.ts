import { AccountId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import { RealFiPositionId, RealFiStakeId } from '../../src/value-objects';

describe('realfi-staking value objects', () => {
  const accountId = AccountId('acc-1');

  it('RealFiStakeId wraps the raw value', () => {
    expect(RealFiStakeId('stake-123')).toBe('stake-123');
  });

  it('RealFiPositionId is derived from the account id', () => {
    expect(RealFiPositionId(accountId)).toBe('realfi-position-acc-1');
  });
});
