import { Wallet } from '@lace/cardano';
import { isPortfolioDrifted } from '../../overview/helpers';
import { mapStakePoolToDisplayData } from './mapStakePoolToDisplayData';
import { DrawerManagementStep, Flow } from './stateMachine';
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

export const shouldRebalancePortfolio = (store: DelegationPortfolioStore): boolean =>
  store.activeFlow === Flow.Overview &&
  store.activeDrawerStep === DrawerManagementStep.Preferences &&
  isPortfolioDrifted(store.currentPortfolio) &&
  // check if sliders unchanged
  !!store.draftPortfolio?.every(
    (pool) => pool.basedOnCurrentPortfolio && pool.sliderIntegerPercentage === pool.savedIntegerPercentage
  );
