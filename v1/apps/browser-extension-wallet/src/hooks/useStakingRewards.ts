import { useWalletStore } from '@src/stores';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { combineLatest, map } from 'rxjs';
import { useObservable } from '@lace/common';

interface UseStakingRewardsReturns {
  totalRewards: BigInt | number;
  lastReward: BigInt | number;
}

const LAST_STABLE_EPOCH = 2;

export const useStakingRewards = (): UseStakingRewardsReturns => {
  const { inMemoryWallet } = useWalletStore();
  const rewardsSummary = useObservable(
    useMemo(
      () =>
        combineLatest([inMemoryWallet.currentEpoch$, inMemoryWallet.delegation.rewardsHistory$]).pipe(
          map(([{ epochNo }, { all }]) => {
            // rewards do not match the ones in the explorer because we aren't taking into account chain rollbacks
            const lastNonVolatileEpoch = epochNo.valueOf() - LAST_STABLE_EPOCH;
            const confirmedRewardHistory = all.filter(({ epoch }) => epoch.valueOf() <= lastNonVolatileEpoch);

            return {
              totalRewards:
                confirmedRewardHistory?.length > 0
                  ? // eslint-disable-next-line unicorn/no-null
                    BigNumber.sum.apply(null, confirmedRewardHistory.map(({ rewards }) => rewards.toString()) ?? [])
                  : 0,
              lastReward: confirmedRewardHistory[confirmedRewardHistory.length - 1]?.rewards || 0
            };
          })
        ),
      [inMemoryWallet.currentEpoch$, inMemoryWallet.delegation.rewardsHistory$]
    )
  );
  return {
    totalRewards: rewardsSummary?.totalRewards || 0,
    lastReward: rewardsSummary?.lastReward || 0
  };
};
