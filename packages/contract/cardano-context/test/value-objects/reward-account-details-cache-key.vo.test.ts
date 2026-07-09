import { describe, expect, it } from 'vitest';

import { CardanoRewardAccount } from '../../src';
import { RewardAccountDetailsCacheKey } from '../../src/value-objects';

const stakeKey1 = CardanoRewardAccount(
  'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
);
const stakeKey2 = CardanoRewardAccount(
  'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
);

describe('RewardAccountDetailsCacheKey', () => {
  it('is deterministic for identical inputs', () => {
    const a = RewardAccountDetailsCacheKey({
      topNonPendingActivityId: 'tx-1',
      topOnChainTxActivityId: 'tx-1',
      stakeKey: stakeKey1,
    });
    const b = RewardAccountDetailsCacheKey({
      topNonPendingActivityId: 'tx-1',
      topOnChainTxActivityId: 'tx-1',
      stakeKey: stakeKey1,
    });
    expect(a).toBe(b);
  });

  it('differs when the topNonPendingActivityId changes', () => {
    const a = RewardAccountDetailsCacheKey({
      topNonPendingActivityId: 'tx-1',
      topOnChainTxActivityId: 'tx-1',
      stakeKey: stakeKey1,
    });
    const b = RewardAccountDetailsCacheKey({
      topNonPendingActivityId: 'tx-2',
      topOnChainTxActivityId: 'tx-1',
      stakeKey: stakeKey1,
    });
    expect(a).not.toBe(b);
  });

  it('differs when the topOnChainTxActivityId changes (reward unchanged on top)', () => {
    // A future-dated reward pins topNonPendingActivityId while a confirmed tx
    // changes only the reward-excluded anchor — the key must still differ.
    const a = RewardAccountDetailsCacheKey({
      topNonPendingActivityId: 'reward-1',
      topOnChainTxActivityId: 'tx-old',
      stakeKey: stakeKey1,
    });
    const b = RewardAccountDetailsCacheKey({
      topNonPendingActivityId: 'reward-1',
      topOnChainTxActivityId: 'tx-new',
      stakeKey: stakeKey1,
    });
    expect(a).not.toBe(b);
  });

  it('differs when the stakeKey changes', () => {
    const a = RewardAccountDetailsCacheKey({
      topNonPendingActivityId: 'tx-1',
      topOnChainTxActivityId: 'tx-1',
      stakeKey: stakeKey1,
    });
    const b = RewardAccountDetailsCacheKey({
      topNonPendingActivityId: 'tx-1',
      topOnChainTxActivityId: 'tx-1',
      stakeKey: stakeKey2,
    });
    expect(a).not.toBe(b);
  });
});
