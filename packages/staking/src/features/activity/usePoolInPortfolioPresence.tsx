import { Cardano } from '@cardano-sdk/core';
import { useDelegationPortfolioStore } from 'features/store';

// Didn't use the useDelegationPortfolioStore helper for that, because it requires hexId.
export const usePoolInPortfolioPresence = () => {
  const currentPortfolio = useDelegationPortfolioStore((store) => store.currentPortfolio);
  const checkIfPoolIsInPortfolio = (poolId?: Cardano.PoolId) =>
    currentPortfolio.some((portfolioEntry) => portfolioEntry.stakePool.id === poolId);
  return { checkIfPoolIsInPortfolio };
};
