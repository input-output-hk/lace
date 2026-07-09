import { AccountId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import { CardanoRewardAccountDetailsFailureId } from '../../src/value-objects';

describe('CardanoRewardAccountDetailsFailureId', () => {
  const accountId = AccountId('wallet1-0-764824073');

  it('constructs an ID with the expected prefix', () => {
    const id = CardanoRewardAccountDetailsFailureId(accountId);
    expect(id).toBe(`cardano-reward-account-details-${accountId}`);
  });
});
