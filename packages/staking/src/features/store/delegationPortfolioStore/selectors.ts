import { Wallet } from '@lace/cardano';
import { PERCENTAGE_SCALE_MAX } from './constants';
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

export const isDraftPortfolioValid = (store: DelegationPortfolioStore): boolean =>
  !!store.draftPortfolio &&
  store.draftPortfolio.length > 0 &&
  store.draftPortfolio.reduce((acc, pool) => acc + pool.sliderIntegerPercentage, 0) === PERCENTAGE_SCALE_MAX &&
  store.draftPortfolio.every((pool) => pool.sliderIntegerPercentage > 0);
