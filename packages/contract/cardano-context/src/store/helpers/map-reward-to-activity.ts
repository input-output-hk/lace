import { createSlotTimeCalc, epochSlotsCalc, Cardano } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber, Timestamp } from '@lace-sdk/util';

import {
  ActivityKind,
  type CardanoRewardActivity,
  type Reward,
} from '../../types';
import { RewardActivityId } from '../../value-objects';

import type {
  MissingActivityData,
  MissingRewardData,
} from './find-missing-activities';
import type { CardanoRewardAccount } from '../../types';
import type { EraSummary } from '@cardano-sdk/core';
import type { AccountId } from '@lace-contract/wallet-repo';

export const REWARD_SPENDABLE_DELAY_EPOCHS = 2;

export type MapRewardToActivityParams = {
  reward: Reward;
  eraSummaries: readonly EraSummary[];
  rewardAccount: CardanoRewardAccount;
  accountId: AccountId;
};

export const getRewardSpendableDate = (
  earnedEpoch: Cardano.EpochNo,
  eraSummaries: readonly EraSummary[],
): Date => {
  const spendableEpoch = (earnedEpoch +
    REWARD_SPENDABLE_DELAY_EPOCHS) as Cardano.EpochNo;
  // Cast needed: SDK functions don't mutate but expect mutable type
  const mutableEraSummaries = eraSummaries as EraSummary[];
  const slotTimeCalc = createSlotTimeCalc(mutableEraSummaries);
  return slotTimeCalc(
    epochSlotsCalc(spendableEpoch, mutableEraSummaries).firstSlot,
  );
};

export const isRewardActivity = (
  activity: MissingActivityData,
): activity is MissingRewardData => {
  return activity.kind === ActivityKind.Reward;
};

/**
 * Maps a reward to a reward activity.
 *
 * @param {MapRewardToActivityParams} params - The parameters for mapping the reward.
 * @returns {RewardActivity} The mapped reward activity.
 */
export const mapRewardToActivity = ({
  reward,
  eraSummaries,
  rewardAccount,
  accountId,
}: MapRewardToActivityParams): CardanoRewardActivity => {
  const time = getRewardSpendableDate(reward.epoch, eraSummaries);
  return {
    accountId,
    activityId: RewardActivityId(reward, rewardAccount),
    timestamp: Timestamp(time.getTime()),
    tokenBalanceChanges: [
      {
        tokenId: TokenId('lovelace'),
        amount: BigNumber(BigInt(reward.rewards)),
      },
    ],
    type: ActivityType.Rewards,
    blockchainSpecific: {
      poolId: reward.poolId ? Cardano.PoolId(reward.poolId) : undefined,
      epoch: (reward.epoch + REWARD_SPENDABLE_DELAY_EPOCHS) as Cardano.EpochNo,
    },
  };
};
