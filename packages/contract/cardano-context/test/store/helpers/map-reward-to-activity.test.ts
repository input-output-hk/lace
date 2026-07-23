import { Cardano, Milliseconds } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { TokenId } from '@lace-contract/tokens';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-lib/util';
import { describe, it, expect } from 'vitest';

import { CardanoRewardAccount, RewardActivityId } from '../../../src';
import {
  getRewardSpendableDate,
  mapRewardToActivity,
} from '../../../src/store/helpers';

import type { Reward } from '../../../src';
import type { EraSummary } from '@cardano-sdk/core';
import type { Timestamp } from '@lace-lib/util';

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

describe('getRewardSpendableDate cross-network isolation (regression)', () => {
  // Real era summaries captured from a user's persisted extension state.
  const MAINNET_ERAS: EraSummary[] = [
    {
      parameters: { epochLength: 21600, slotLength: Milliseconds(20000) },
      start: { slot: 0, time: new Date(1506203091000) },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 4492800, time: new Date(1596059091000) },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 16588800, time: new Date(1608155091000) },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 23068800, time: new Date(1614635091000) },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 39916800, time: new Date(1631483091000) },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 72316800, time: new Date(1663883091000) },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 133660800, time: new Date(1725227091000) },
    },
  ];

  const PREPROD_ERAS: EraSummary[] = [
    {
      parameters: { epochLength: 21600, slotLength: Milliseconds(20000) },
      start: { slot: 0, time: new Date(1654041600000) },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 86400, time: new Date(1655769600000) },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 518400, time: new Date(1656201600000) },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 950400, time: new Date(1656633600000) },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 1382400, time: new Date(1657065600000) },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 3542400, time: new Date(1659225600000) },
    },
    {
      parameters: { epochLength: 432000, slotLength: Milliseconds(1000) },
      start: { slot: 68774400, time: new Date(1724457600000) },
    },
  ];

  // Real mainnet reward: earned epoch 637 (spendable epoch 639).
  const EARNED_EPOCH = Cardano.EpochNo(637);
  const CORRECT_MAINNET_MS = 1782251091000; // 2026-06-23 — correct mainnet date
  const PREPROD_EPOCH_639_MS = 1930089600000; // preprod's own date for epoch 639
  const PRE_FIX_LEAK_MS = 1865972691000; // 2029-02-16 — value the old shared cache leaked

  it('dates a mainnet reward from its own era summaries', () => {
    const date = getRewardSpendableDate(EARNED_EPOCH, MAINNET_ERAS);

    expect(date.getTime()).toBe(CORRECT_MAINNET_MS);
    expect(date.getUTCFullYear()).toBe(2026);
  });

  it('does not leak a testnet computation into the mainnet result', () => {
    // Compute the same epoch with testnet eras first — this used to poison the
    // SDK's shared cache and make the mainnet result 2029. Each computation must
    // now stay independent and correct.
    const preprodDate = getRewardSpendableDate(EARNED_EPOCH, PREPROD_ERAS);
    const mainnetDate = getRewardSpendableDate(EARNED_EPOCH, MAINNET_ERAS);

    expect(preprodDate.getTime()).toBe(PREPROD_EPOCH_639_MS);
    expect(mainnetDate.getTime()).toBe(CORRECT_MAINNET_MS);
    expect(mainnetDate.getTime()).not.toBe(PRE_FIX_LEAK_MS);
  });
});
