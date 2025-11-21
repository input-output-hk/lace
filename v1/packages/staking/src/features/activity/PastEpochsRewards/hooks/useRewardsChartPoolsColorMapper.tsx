/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { PIE_CHART_DEFAULT_COLOR_SET } from '@input-output-hk/lace-ui-toolkit';
import { useDelegationPortfolioStore } from 'features/store';
import difference from 'lodash/difference';
import { useMemo } from 'react';
import type { RewardsByEpoch } from './useRewardsByEpoch';
import type { Cardano } from '@cardano-sdk/core';

const GRAYSCALE_PALETTE = [
  '#343434',
  '#4a4a4a',
  '#616161',
  '#787878',
  '#8e8e8e',
  '#a5a5a5',
  '#bbbbbb',
  '#d2d2d2',
  '#e8e8e8',
  '#fafafa',
];

export const useRewardsChartPoolsColorMapper = (rewardsByEpoch: RewardsByEpoch) => {
  const { currentPortfolio } = useDelegationPortfolioStore();

  const coloring = useMemo(() => {
    const poolsInPortfolio = currentPortfolio.map(({ stakePool }) => stakePool.id);
    const historicalPools = rewardsByEpoch
      .flatMap((rewards) => rewards.rewards.map((reward) => reward.poolId))
      .filter(Boolean) as Cardano.PoolId[];
    const poolsNotInPortfolio = difference(historicalPools, poolsInPortfolio);

    const poolsInPortfolioColoring = poolsInPortfolio.reduce((acc, poolId, index) => {
      acc[poolId] = PIE_CHART_DEFAULT_COLOR_SET[index % PIE_CHART_DEFAULT_COLOR_SET.length]!;
      return acc;
    }, {} as Record<Cardano.PoolId, string>);

    const poolsNotInPortfolioColoring = poolsNotInPortfolio.reduce((acc, poolId, index) => {
      acc[poolId] = GRAYSCALE_PALETTE[index % GRAYSCALE_PALETTE.length]!;
      return acc;
    }, {} as Record<Cardano.PoolId, string>);

    return { ...poolsInPortfolioColoring, ...poolsNotInPortfolioColoring };
  }, [currentPortfolio, rewardsByEpoch]);

  return (poolId?: Cardano.PoolId) => (poolId ? coloring[poolId] : GRAYSCALE_PALETTE[0]);
};
