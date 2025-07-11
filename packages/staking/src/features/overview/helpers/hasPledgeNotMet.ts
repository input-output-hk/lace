import { CurrentPortfolioStakePool } from '../../store';

export const hasPledgeNotMetPools = (currentPortfolio: CurrentPortfolioStakePool[]) =>
  currentPortfolio.some(({ stakePool }) =>
    stakePool.metrics?.livePledge ? stakePool.metrics.livePledge < stakePool.pledge : false
  );
