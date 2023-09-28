import { Wallet } from '@lace/cardano';
import { mapStakePoolToDisplayData } from './mapStakePoolToDisplayData';
import { Flow } from './stateMachine';
import { DelegationPortfolioStore, StakePoolDetails } from './types';

export const isDrawerVisible = ({ activeFlow }: DelegationPortfolioStore) =>
  [Flow.CurrentPoolDetails, Flow.PortfolioManagement, Flow.NewPortfolio, Flow.PoolDetails].includes(activeFlow);

export const stakePoolDetailsSelector = ({
  cardanoCoinSymbol,
  viewedStakePool,
}: DelegationPortfolioStore): StakePoolDetails | undefined => {
  if (!viewedStakePool) return undefined;
  // eslint-disable-next-line consistent-return
  return mapStakePoolToDisplayData({ cardanoCoinSymbol, stakePool: viewedStakePool });
};

export const isPoolSelectedSelector = (poolHexId: Wallet.Cardano.PoolIdHex) => (store: DelegationPortfolioStore) =>
  !!store.selectedPortfolio?.find((pool) => pool.id === poolHexId);
