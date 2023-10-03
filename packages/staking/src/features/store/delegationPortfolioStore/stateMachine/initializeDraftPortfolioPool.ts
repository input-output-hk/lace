import { Wallet } from '@lace/cardano';
import { mapStakePoolToPortfolioPool } from './mapStakePoolToPortfolioPool';
import { DraftPortfolioStakePool, State } from './types';

export const initializeDraftPortfolioPool = ({
  state,
  initialPercentage,
  stakePool,
}: {
  state: State;
  initialPercentage: number;
  stakePool: Wallet.Cardano.StakePool;
}): DraftPortfolioStakePool => {
  // try to find new pool among current portfolio pools to retrieve its onchain and saved percentages
  const matchingCurrentPortfolioPool = state.currentPortfolio.find(({ id }) => stakePool.hexId === id);
  return matchingCurrentPortfolioPool
    ? { ...matchingCurrentPortfolioPool, sliderIntegerPercentage: initialPercentage }
    : mapStakePoolToPortfolioPool({
        cardanoCoinSymbol: state.cardanoCoinSymbol,
        sliderIntegerPercentage: initialPercentage,
        stakePool,
      });
};
