import { AccountId } from '@lace-contract/wallet-repo';
import { Timestamp } from '@lace-sdk/util';
import { describe, expect, it } from 'vitest';

import { ActivityType } from '../../../src/const';
import { rewardEpochDisplay } from '../../../src/store/migrations/reward-epoch-display';

import type { ActivitiesSliceState } from '../../../src/store/slice';

describe('rewardEpochDisplay', () => {
  it('adds 2 to reward activity epoch in persisted state', () => {
    const state = {
      activities: {
        [AccountId('account1')]: [
          {
            accountId: AccountId('account1'),
            activityId: 'reward-100-stake1xxx-pool1xxx',
            timestamp: Timestamp(1_700_000_000_000),
            tokenBalanceChanges: [] as { tokenId: string; amount: unknown }[],
            type: ActivityType.Rewards,
            blockchainSpecific: { epoch: 100 },
          },
        ],
      },
      desiredLoadedActivitiesCountPerAccount: {},
      hasLoadedOldestEntry: {},
    } as ActivitiesSliceState;

    const result = rewardEpochDisplay(state as never) as ActivitiesSliceState;

    expect(
      result.activities[AccountId('account1')][0].blockchainSpecific,
    ).toEqual({
      epoch: 102,
    });
  });

  it('leaves non-reward activities unchanged', () => {
    const state = {
      activities: {
        [AccountId('account1')]: [
          {
            accountId: AccountId('account1'),
            activityId: 'tx-1',
            timestamp: Timestamp(1_700_000_000_000),
            tokenBalanceChanges: [] as { tokenId: string; amount: unknown }[],
            type: ActivityType.Send,
            blockchainSpecific: { epoch: 100 },
          },
        ],
      },
      desiredLoadedActivitiesCountPerAccount: {},
      hasLoadedOldestEntry: {},
    } as ActivitiesSliceState;

    const result = rewardEpochDisplay(state as never) as ActivitiesSliceState;

    expect(
      result.activities[AccountId('account1')][0].blockchainSpecific,
    ).toEqual({
      epoch: 100,
    });
  });

  it('handles reward activities without blockchainSpecific.epoch', () => {
    const state = {
      activities: {
        [AccountId('account1')]: [
          {
            accountId: AccountId('account1'),
            activityId: 'reward-100-stake1xxx-pool1xxx',
            timestamp: Timestamp(1_700_000_000_000),
            tokenBalanceChanges: [] as { tokenId: string; amount: unknown }[],
            type: ActivityType.Rewards,
            blockchainSpecific: {},
          },
        ],
      },
      desiredLoadedActivitiesCountPerAccount: {},
      hasLoadedOldestEntry: {},
    } as ActivitiesSliceState;

    const result = rewardEpochDisplay(state as never) as ActivitiesSliceState;

    expect(
      result.activities[AccountId('account1')][0].blockchainSpecific,
    ).toEqual({});
  });
});
