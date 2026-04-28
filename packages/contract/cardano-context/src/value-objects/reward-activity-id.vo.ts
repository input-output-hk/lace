import type { CardanoRewardAccount, Reward } from '../types';
import type { Tagged } from 'type-fest';

export type RewardActivityId = Tagged<string, 'RewardActivityId'>;

export const RewardActivityId = (
  reward: Reward,
  rewardAccount: CardanoRewardAccount,
): RewardActivityId =>
  `reward-${reward.epoch}-${rewardAccount}-${reward.poolId}` as RewardActivityId;
