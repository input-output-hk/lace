import { Cardano, Reward } from '@cardano-sdk/core';
import { RewardsHistory } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';
import { useOutsideHandles } from 'features/outside-handles-provider';
import { groupBy, sortBy, takeLast, uniqBy } from 'rambda';
import { useEffect, useState } from 'react';

export type RewardWithMetadata = Omit<Reward, 'rewards'> & {
  metadata: Cardano.StakePoolMetadata | undefined;
  rewards: string; // TODO move the transformation to the chart
};

export type RewardsByEpoch = { epoch: number; rewards: RewardWithMetadata[] }[];

export type UseRewardsByEpochProps = {
  epochsCount: number;
};

const getPoolInfos = async (poolIds: Wallet.Cardano.PoolId[], stakePoolProvider: Wallet.StakePoolProvider) => {
  const filters: Wallet.QueryStakePoolsArgs = {
    filters: {
      identifier: {
        _condition: 'or',
        values: poolIds.map((poolId) => ({ id: poolId })),
      },
    },
    pagination: {
      limit: 100,
      startAt: 0,
    },
  };
  const { pageResults: pools } = await stakePoolProvider.queryStakePools(filters);

  return pools;
};

type GetRewardsByEpochProps = {
  rewardsHistory: RewardsHistory;
  stakePoolProvider: Wallet.StakePoolProvider;
  epochsCount: number;
};

const buildRewardsByEpoch = async ({ rewardsHistory, stakePoolProvider, epochsCount }: GetRewardsByEpochProps) => {
  const uniqPoolIds = uniqBy((rewards) => rewards.poolId, rewardsHistory.all)
    .map((reward) => reward.poolId)
    .filter(Boolean) as Wallet.Cardano.PoolId[];
  const stakePoolsData = await getPoolInfos(uniqPoolIds, stakePoolProvider);
  const rewardsHistoryWithMetadata = rewardsHistory.all.map((reward) => ({
    ...reward,
    metadata: stakePoolsData.find((poolInfo) => poolInfo.id === reward.poolId)?.metadata,
    rewards: Wallet.util.lovelacesToAdaString(reward.rewards.toString()),
  }));
  const groupedRewards = groupBy(({ epoch }) => epoch.toString(), rewardsHistoryWithMetadata);
  const groupedRewardsArray = Object.entries(groupedRewards).map(([epoch, rewards]) => ({
    epoch: Number.parseInt(epoch),
    rewards,
  }));
  const sortedByEpoch = sortBy((entry) => entry.epoch, groupedRewardsArray);
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
