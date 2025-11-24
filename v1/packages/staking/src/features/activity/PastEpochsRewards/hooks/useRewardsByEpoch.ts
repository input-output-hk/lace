import { Cardano, Reward } from '@cardano-sdk/core';
import { RewardsHistory } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';
import { getPoolInfos } from 'features/BrowsePools';
import { useOutsideHandles } from 'features/outside-handles-provider';
import { groupBy, sortBy, takeLast, uniqBy } from 'rambda';
import { useEffect, useState } from 'react';

type RewardWithPoolMetadata = Omit<Reward, 'rewards' | 'epoch'> & {
  metadata: Cardano.StakePoolMetadata | undefined;
  spendableEpoch: Cardano.EpochNo;
  rewards: string;
};

export type RewardsByEpoch = { spendableEpoch: Cardano.EpochNo; rewards: RewardWithPoolMetadata[] }[];

export type UseRewardsByEpochProps = {
  epochsCount: number;
};

type GetRewardsByEpochProps = {
  rewardsHistory: RewardsHistory;
  stakePoolProvider: Wallet.StakePoolProvider;
  epochsCount: number;
};

const buildRewardsByEpoch = async ({ rewardsHistory, stakePoolProvider, epochsCount }: GetRewardsByEpochProps) => {
  const REWARD_SPENDABLE_DELAY_EPOCHS = 2;
  const uniqPoolIds = uniqBy((rewards) => rewards.poolId, rewardsHistory.all)
    .map((reward) => reward.poolId)
    .filter(Boolean) as Wallet.Cardano.PoolId[];
  const stakePoolsData = await getPoolInfos({ poolIds: uniqPoolIds, stakePoolProvider });
  const rewardsHistoryWithMetadata = rewardsHistory.all.map((reward) => ({
    ...reward,
    metadata: stakePoolsData.find((poolInfo) => poolInfo.id === reward.poolId)?.metadata,
    rewards: Wallet.util.lovelacesToAdaString(reward.rewards.toString()),
    spendableEpoch: (reward.epoch + REWARD_SPENDABLE_DELAY_EPOCHS) as Cardano.EpochNo,
  }));
  const groupedRewards = groupBy(({ epoch }) => epoch.toString(), rewardsHistoryWithMetadata);
  const groupedRewardsArray = Object.entries(groupedRewards).map(([epoch, rewards]) => ({
    rewards,
    spendableEpoch: (Number.parseInt(epoch) + REWARD_SPENDABLE_DELAY_EPOCHS) as Cardano.EpochNo,
  }));
  const sortedByEpoch = sortBy((entry) => entry.spendableEpoch, groupedRewardsArray);
  return takeLast(epochsCount, sortedByEpoch);
};

export const useRewardsByEpoch = ({ epochsCount }: UseRewardsByEpochProps) => {
  const [rewardsByEpoch, setRewardsByEpoch] = useState<RewardsByEpoch>();
  const { walletStoreInMemoryWallet: inMemoryWallet, walletStoreBlockchainProvider } = useOutsideHandles();
  const rewardsHistory = useObservable(inMemoryWallet.delegation.rewardsHistory$);
  useEffect(() => {
    if (!rewardsHistory) return;
    (async () => {
      const result = await buildRewardsByEpoch({
        epochsCount,
        rewardsHistory,
        stakePoolProvider: walletStoreBlockchainProvider.stakePoolProvider,
      });
      setRewardsByEpoch(result);
    })();
  }, [epochsCount, rewardsHistory, walletStoreBlockchainProvider]);
  return { rewardsByEpoch };
};
