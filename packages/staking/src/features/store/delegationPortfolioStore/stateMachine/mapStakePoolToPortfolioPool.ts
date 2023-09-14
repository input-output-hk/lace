import { Wallet } from '@lace/cardano';
import { mapStakePoolToDisplayData } from '../mapStakePoolToDisplayData';
import { AdaSymbol } from '../types';
import { DraftPortfolioStakePool } from './types';

export const mapStakePoolToPortfolioPool = ({
  cardanoCoinSymbol,
  stakePool,
}: {
  cardanoCoinSymbol: AdaSymbol;
  stakePool: Wallet.Cardano.StakePool;
}): DraftPortfolioStakePool => ({
  basedOnCurrentPortfolio: false,
  displayData: mapStakePoolToDisplayData({ cardanoCoinSymbol, stakePool }),
  id: stakePool.hexId,
  targetWeight: 1,
});
