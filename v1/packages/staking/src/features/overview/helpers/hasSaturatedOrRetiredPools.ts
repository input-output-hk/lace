import { CurrentPortfolioStakePool } from '../../store';

export const SATURATION_UPPER_BOUND = 100;

export const isOverSaturated = (saturation: string | number) => Number(saturation) >= SATURATION_UPPER_BOUND;

export const hasSaturatedOrRetiredPools = (currentPortfolio: CurrentPortfolioStakePool[]) =>
  currentPortfolio.some(
    ({ stakePool, displayData }) =>
      stakePool.status === 'retired' || stakePool.status === 'retiring' || isOverSaturated(displayData.saturation || 0)
  );
