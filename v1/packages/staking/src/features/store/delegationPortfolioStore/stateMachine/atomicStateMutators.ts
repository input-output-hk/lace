import { Wallet } from '@lace/cardano';
import { PERCENTAGE_SCALE_MAX } from '../constants';
import { initializeDraftPortfolioPool } from './initializeDraftPortfolioPool';
import { normalizePercentages } from './normalizePercentages';
import {
  DelegationFlow,
  DraftPortfolioStakePool,
  DrawerDefaultStep,
  DrawerManagementStep,
  StakePoolWithLogo,
  State,
} from './types';

const missingDraftPortfolioErrorMessage = 'DelegationPortfolioState: Inconsistent state: missing draftPortfolio';

export const atomicStateMutators = {
  addPoolsFromPreferences: ({ state }: { state: State }) => {
    if (!state.draftPortfolio) throw new Error(missingDraftPortfolioErrorMessage);
    return {
      activeDelegationFlow: DelegationFlow.BrowsePools,
      activeDrawerStep: undefined,
      draftPortfolio: undefined,
      selectedPortfolio: state.draftPortfolio,
    } as const;
  },
  beginNewPortfolioCreation: ({
    selections,
    isSharedWallet,
  }: {
    selections: DraftPortfolioStakePool[];
    isSharedWallet?: boolean;
  }) => {
    // RESPONSIBLITY: If all new pools have 0 percentages (just added pools), rebalance equally
    let targetDraftPortfolio;
    const allPoolsHaveZeroPercentages = selections.every(
      ({ sliderIntegerPercentage }) => sliderIntegerPercentage === 0
    );

    if (allPoolsHaveZeroPercentages) {
      const percentageValue = PERCENTAGE_SCALE_MAX / selections.length; // may be float
      targetDraftPortfolio = selections.map((pool) => ({
        ...pool,
        sliderIntegerPercentage: percentageValue,
      }));
      targetDraftPortfolio = normalizePercentages({ items: targetDraftPortfolio, key: 'sliderIntegerPercentage' });
    } else {
      targetDraftPortfolio = selections;
    }

    return {
      activeDelegationFlow: DelegationFlow.NewPortfolio,
      activeDrawerStep: isSharedWallet ? DrawerManagementStep.Confirmation : DrawerManagementStep.Preferences,
      draftPortfolio: targetDraftPortfolio,
    } as const;
  },
  cancelDrawer: <F extends DelegationFlow.Overview | DelegationFlow.BrowsePools>({
    targetFlow,
  }: {
    state: State;
    targetFlow: F;
  }) => ({
    activeDelegationFlow: targetFlow,
    activeDrawerStep: undefined,
  }),
  removePoolFromPreferences: ({ id, state }: { id: Wallet.Cardano.PoolIdHex; state: State }) => {
    if (!state.draftPortfolio) throw new Error(missingDraftPortfolioErrorMessage);
    return {
      draftPortfolio: state.draftPortfolio.filter((pool) => pool.id !== id),
    } as const;
  },
  selectPools: ({ stakePools, state }: { stakePools: Wallet.Cardano.StakePool[]; state: State }) => {
    const newPools = stakePools.map((pool: Wallet.Cardano.StakePool) =>
      initializeDraftPortfolioPool({ initialPercentage: 0, stakePool: pool, state })
    );

    return {
      // placing new pools at the top of the list for better UX
      selectedPortfolio: [...newPools, ...state.selectedPortfolio],
    };
  },
  showChangingPreferencesConfirmation: ({
    pendingSelectedPortfolio,
  }: {
    pendingSelectedPortfolio: DraftPortfolioStakePool[];
  }) =>
    ({
      activeDelegationFlow: DelegationFlow.ChangingPreferences,
      activeDrawerStep: undefined,
      pendingSelectedPortfolio,
      viewedStakePool: undefined,
    } as const),
  showPoolDetails: <F extends DelegationFlow.CurrentPoolDetails | DelegationFlow.PoolDetails>({
    pool,
    targetFlow,
  }: {
    pool: StakePoolWithLogo;
    targetFlow: F;
  }) =>
    ({
      activeDelegationFlow: targetFlow,
      activeDrawerStep: DrawerDefaultStep.PoolDetails,
      viewedStakePool: pool,
    } as const),
  unselectPool: ({ id, state }: { id: Wallet.Cardano.PoolIdHex; state: State }) =>
    ({
      selectedPortfolio: state.selectedPortfolio.filter((pool) => pool.id !== id),
    } as const),
  updateStakePercentage: ({
    id,
    newSliderPercentage,
    state,
  }: {
    id: Wallet.Cardano.PoolIdHex;
    newSliderPercentage: number;
    state: State;
  }) => {
    if (!state.draftPortfolio) throw new Error(missingDraftPortfolioErrorMessage);
    return {
      draftPortfolio: state.draftPortfolio.map((pool) =>
        pool.id === id ? { ...pool, sliderIntegerPercentage: newSliderPercentage } : pool
      ),
    } as const;
  },
};
