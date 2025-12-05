/* eslint-disable no-magic-numbers */
import { RewardsProvider, Reward, Cardano } from '@cardano-sdk/core';

const mockEpochRewards: Reward[] = [
  {
    epoch: Cardano.EpochNo(1),
    rewards: BigInt(100)
  }
];

const rewardHistoryMap = new Map();
rewardHistoryMap.set('11111', mockEpochRewards);

export const rewardsHistoryProviderStub = (): RewardsProvider => ({
  rewardsHistory: jest.fn().mockResolvedValue(rewardHistoryMap),
  rewardAccountBalance: jest.fn().mockResolvedValue(BigInt(100)),
  healthCheck: jest.fn().mockResolvedValue({ ok: true })
});
