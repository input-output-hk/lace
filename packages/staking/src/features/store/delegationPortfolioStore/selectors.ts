import { Wallet } from '@lace/cardano';
import { mapStakePoolToDisplayData } from './mapStakePoolToDisplayData';
import { DelegationFlow } from './stateMachine';
import { DelegationPortfolioStore, StakePoolDetails } from './types';

export const isDrawerVisible = ({ activeDelegationFlow }: DelegationPortfolioStore) =>
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
  // @ts-expect-error TODO: filter pools without metrics (this technically shouldn't happen)
  // eslint-disable-next-line consistent-return
  return mapStakePoolToDisplayData({ stakePool: viewedStakePool });
};

export const isPoolSelectedSelector = (poolHexId: Wallet.Cardano.PoolIdHex) => (store: DelegationPortfolioStore) =>
  !!store.selectedPortfolio?.find((pool) => pool.id === poolHexId);
