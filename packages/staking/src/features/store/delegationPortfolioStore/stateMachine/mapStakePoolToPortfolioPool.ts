import { Wallet } from '@lace/cardano';
import { mapStakePoolToDisplayData } from '../mapStakePoolToDisplayData';
import { AdaSymbol } from '../types';

export const mapStakePoolToPortfolioPool = ({
  cardanoCoinSymbol,
  stakePool,
}: {
  cardanoCoinSymbol: AdaSymbol;
  stakePool: Wallet.Cardano.StakePool;
}) => ({
  displayData: mapStakePoolToDisplayData({ cardanoCoinSymbol, stakePool }),
  id: stakePool.hexId,
  name: stakePool.metadata?.name,
  ticker: stakePool.metadata?.ticker,
  weight: 1,
});
