import { Wallet } from '@lace/cardano';
import { STAKING_PAGE_BY_FLOW } from './constants';
import { mapStakePoolToDisplayData } from './mapStakePoolToDisplayData';
import { DelegationFlow } from './stateMachine';
import { DelegationPortfolioStore, StakePoolDetails } from './types';

export const isDrawerVisibleSelector = ({ activeDelegationFlow }: DelegationPortfolioStore) =>
  [
    DelegationFlow.CurrentPoolDetails,
    DelegationFlow.PortfolioManagement,
    DelegationFlow.NewPortfolio,
    DelegationFlow.PoolDetails,
  ].includes(activeDelegationFlow);

export const stakePoolDetailsSelector = ({
  viewedStakePool,
}: DelegationPortfolioStore): StakePoolDetails | undefined => {
  if (!viewedStakePool) return undefined;
  // eslint-disable-next-line consistent-return
  return mapStakePoolToDisplayData({ stakePool: viewedStakePool });
};

export const isPoolSelectedSelector = (poolHexId: Wallet.Cardano.PoolIdHex) => (store: DelegationPortfolioStore) =>
  !!store.selectedPortfolio?.find((pool) => pool.id === poolHexId);

export const activePageSelector = ({ activeDelegationFlow }: DelegationPortfolioStore) =>
  STAKING_PAGE_BY_FLOW[activeDelegationFlow];
