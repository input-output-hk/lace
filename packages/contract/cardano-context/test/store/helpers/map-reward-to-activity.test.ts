import { Cardano, Milliseconds } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { TokenId } from '@lace-contract/tokens';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-sdk/util';
import { describe, it, expect } from 'vitest';

import { CardanoRewardAccount, RewardActivityId } from '../../../src';
import {
  getRewardSpendableDate,
  mapRewardToActivity,
} from '../../../src/store/helpers';

import type { Reward } from '../../../src';
import type { EraSummary } from '@cardano-sdk/core';
import type { Timestamp } from '@lace-sdk/util';

describe('mapRewardToActivity', () => {
  const eraSummaries: EraSummary[] = [
    {
      parameters: { epochLength: 21600, slotLength: Milliseconds(20000) },
      start: { slot: 0, time: new Date('2022-06-01T00:00:00.000Z') },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 86400, time: new Date('2022-06-21T00:00:00.000Z') },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 518400, time: new Date('2022-06-26T00:00:00.000Z') },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 950400, time: new Date('2022-07-01T00:00:00.000Z') },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 1382400, time: new Date('2022-07-06T00:00:00.000Z') },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 3542400, time: new Date('2022-07-31T00:00:00.000Z') },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 68774400, time: new Date('2024-08-24T00:00:00.000Z') },
    },
  ];

  const rewardAccount = CardanoRewardAccount(
    'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
  );

  const mockReward: Reward = {
    epoch: Cardano.EpochNo(100),
    rewards: BigNumber(BigInt('1000000')),
    poolId: Cardano.PoolId(
      'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
    ),
  };
  const accountId = AccountId('account1');

  describe('getRewardSpendableDate', () => {
    it('should calculate correct spendable date for reward', () => {
      const earnedEpoch = Cardano.EpochNo(100);
      const spendableDate = getRewardSpendableDate(earnedEpoch, eraSummaries);

      expect(spendableDate).toBeInstanceOf(Date);
      expect(spendableDate.getTime()).toBeGreaterThan(0);
    });
  });

  describe('mapRewardToActivity', () => {
    it('should map reward to activity correctly', () => {
      const result = mapRewardToActivity({
        accountId,
        reward: mockReward,
        eraSummaries,
        rewardAccount,
      });

      expect(result).toEqual({
        accountId,
        activityId: RewardActivityId(mockReward, rewardAccount),
        timestamp: expect.any(Number) as Timestamp,
        tokenBalanceChanges: [
          {
            tokenId: TokenId('lovelace'),
            amount: BigNumber(BigInt(mockReward.rewards)),
          },
        ],
        type: ActivityType.Rewards,
        blockchainSpecific: {
          poolId: Cardano.PoolId(mockReward.poolId || ''),
          epoch: Cardano.EpochNo(102), // API epoch 100 + REWARD_SPENDABLE_DELAY_EPOCHS (2)
        },
      });
    });

    it('should handle rewards without poolId', () => {
      const rewardWithoutPoolId: Reward = {
        epoch: Cardano.EpochNo(101),
        rewards: BigNumber(BigInt('2000000')),
      };

      const result = mapRewardToActivity({
        accountId,
        reward: rewardWithoutPoolId,
        eraSummaries,
        rewardAccount,
      });

      expect(result).toEqual({
        accountId,
        activityId: RewardActivityId(rewardWithoutPoolId, rewardAccount),
        timestamp: expect.any(Number) as Timestamp,
        tokenBalanceChanges: [
          {
            tokenId: TokenId('lovelace'),
            amount: BigNumber(BigInt(rewardWithoutPoolId.rewards)),
          },
        ],
        type: ActivityType.Rewards,
        blockchainSpecific: {
          poolId: undefined,
          epoch: Cardano.EpochNo(103), // API epoch 101 + REWARD_SPENDABLE_DELAY_EPOCHS (2)
        },
      });
    });
  });
});
