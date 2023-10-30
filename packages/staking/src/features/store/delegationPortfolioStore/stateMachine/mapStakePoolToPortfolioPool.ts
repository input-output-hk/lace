import { Wallet } from '@lace/cardano';
import { mapStakePoolToDisplayData } from '../mapStakePoolToDisplayData';
import { AdaSymbol } from '../types';
import { DraftPortfolioStakePool } from './types';

export const mapStakePoolToPortfolioPool = ({
  cardanoCoinSymbol,
  stakePool,
  sliderIntegerPercentage,
}: {
  cardanoCoinSymbol: AdaSymbol;
  stakePool: Wallet.Cardano.StakePool;
  sliderIntegerPercentage: number;
}): DraftPortfolioStakePool => ({
  basedOnCurrentPortfolio: false,
  displayData: mapStakePoolToDisplayData({ cardanoCoinSymbol, stakePool }),
  id: stakePool.hexId,
  sliderIntegerPercentage,
  stakePool,
});
