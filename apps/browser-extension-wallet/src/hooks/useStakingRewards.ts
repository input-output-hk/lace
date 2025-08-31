/* eslint-disable sonarjs/cognitive-complexity, max-statements, complexity */
import { useWalletStore } from '@src/stores';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { combineLatest, map } from 'rxjs';
import { useObservable, logger } from '@lace/common';

interface UseStakingRewardsReturns {
  totalRewards: BigInt | number;
  lastReward: BigInt | number;
}

const LAST_STABLE_EPOCH = 2;
const LOVELACE_TO_ADA = 1_000_000;

// Debug logging function
const logRewardsDebug = (message: string, data?: unknown) => {
  logger.info(`🔍 [REWARDS_DEBUG] ${message}`, data || '');
};

export const useStakingRewards = (): UseStakingRewardsReturns => {
  const { inMemoryWallet } = useWalletStore();

  const rewardsSummary = useObservable(
    useMemo(
      () =>
        combineLatest([inMemoryWallet.currentEpoch$, inMemoryWallet.delegation.rewardsHistory$]).pipe(
          map(([{ epochNo }, { all }]) => {
            logRewardsDebug('=== REWARDS CALCULATION START ===');
            logRewardsDebug('Current epoch:', epochNo?.valueOf());
            logRewardsDebug('Total rewards history entries:', all?.length || 0);
            logRewardsDebug('Raw rewards history:', all);

            // rewards do not become stable until 2 epochs after they are distributed
            const lastNonVolatileEpoch = epochNo.valueOf() - LAST_STABLE_EPOCH;
            logRewardsDebug('Last non-volatile epoch:', lastNonVolatileEpoch);
            logRewardsDebug('LAST_STABLE_EPOCH constant:', LAST_STABLE_EPOCH);
            logRewardsDebug('Epochs being excluded:', [epochNo.valueOf(), epochNo.valueOf() - 1]);

            const confirmedRewardHistory = all?.filter(({ epoch }) => epoch.valueOf() <= lastNonVolatileEpoch) ?? [];
            logRewardsDebug('Confirmed rewards history (filtered):', confirmedRewardHistory);
            logRewardsDebug('Number of confirmed rewards:', confirmedRewardHistory.length);

            if (confirmedRewardHistory.length > 0) {
              logRewardsDebug('First confirmed reward:', confirmedRewardHistory[0]);
              logRewardsDebug('Last confirmed reward:', confirmedRewardHistory[confirmedRewardHistory.length - 1]);

              // Log each reward entry for detailed inspection
              logRewardsDebug('=== DETAILED REWARDS BREAKDOWN ===');
              confirmedRewardHistory.forEach((reward, index) => {
                logRewardsDebug(`Reward ${index + 1}:`, {
                  epoch: reward.epoch.valueOf(),
                  rewards: reward.rewards.toString(),
                  poolId: reward.poolId?.toString(),
                  rewardsInLovelace: reward.rewards.toString(),
                  // eslint-disable-next-line no-magic-numbers
                  rewardsInAda: (Number(reward.rewards) / LOVELACE_TO_ADA).toFixed(6)
                });
              });
            }

            // ORIGINAL LOGIC: Use BigNumber.sum with string conversion
            let totalRewards = 0;
            let lastReward = 0;
            let totalBigNumber: BigNumber | undefined;

            if (confirmedRewardHistory.length > 0) {
              const rewardStrings = confirmedRewardHistory.map(({ rewards }) => rewards.toString());
              const total = BigNumber.sum.apply(undefined, rewardStrings ?? []);
              totalBigNumber = total;
              totalRewards = total.dividedBy(LOVELACE_TO_ADA).toNumber();

              // Store debug info for UI display
              const debugInfo = {
                currentEpoch: epochNo?.valueOf(),
                rawRewardsHistoryLength: all?.length || 0,
                confirmedRewardsLength: confirmedRewardHistory?.length || 0,
                rewardsArray: rewardStrings,
                totalBigNumber: total.toString(),
                totalADA: total.dividedBy(LOVELACE_TO_ADA).toString()
              };

              // Store debug info in a way that won't be stripped by minification
              if (typeof window !== 'undefined') {
                (window as unknown as Record<string, unknown>).rewardsDebugInfo = debugInfo;
              }

              // Calculate last reward
              const last = confirmedRewardHistory[confirmedRewardHistory.length - 1];
              const lastRewardValue = new BigNumber(last.rewards.toString());
              lastReward = lastRewardValue.dividedBy(LOVELACE_TO_ADA).toNumber();

              // Store debug info for UI display
              const lastRewardDebugInfo = {
                lastRewardRaw: last.rewards.toString(),
                lastRewardBigNumber: lastRewardValue.toString(),
                lastRewardADA: lastRewardValue.dividedBy(LOVELACE_TO_ADA).toString(),
                epoch: last.epoch.valueOf()
              };

              // Store debug info in a way that won't be stripped by minification
              if (typeof window !== 'undefined') {
                (window as unknown as Record<string, unknown>).lastRewardDebugInfo = lastRewardDebugInfo;
              }
            }

            logRewardsDebug('Total rewards calculation details:');
            logRewardsDebug('  - confirmedRewardHistory.length:', confirmedRewardHistory.length);
            logRewardsDebug(
              '  - rewards values:',
              confirmedRewardHistory.map(({ rewards }) => rewards.toString())
            );
            logRewardsDebug('  - BigNumber.sum result:', totalBigNumber?.toString() || '0');
            logRewardsDebug('  - totalRewards type:', typeof totalRewards);
            logRewardsDebug('  - totalRewards value:', totalRewards);
            logRewardsDebug(
              '  - totalRewards in ADA:',
              totalBigNumber ? totalBigNumber.dividedBy(LOVELACE_TO_ADA).toString() : '0'
            );

            logRewardsDebug('Last reward:', lastReward);
            logRewardsDebug('Last reward type:', typeof lastReward);
            logRewardsDebug('=== REWARDS CALCULATION END ===');

            return {
              totalRewards,
              lastReward
            };
          })
        ),
      [inMemoryWallet.currentEpoch$, inMemoryWallet.delegation.rewardsHistory$]
    )
  );

  return rewardsSummary ?? { totalRewards: 0, lastReward: 0 };
};
