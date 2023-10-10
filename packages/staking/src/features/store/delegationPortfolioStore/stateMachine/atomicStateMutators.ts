import { Wallet } from '@lace/cardano';
import { MAX_POOLS_COUNT, PERCENTAGE_SCALE_MAX } from '../constants';
import { initializeDraftPortfolioPool } from './initializeDraftPortfolioPool';
import { normalizePercentages } from './normalizePercentages';
import {
  DraftPortfolioStakePool,
  DrawerDefaultStep,
  DrawerManagementStep,
  Flow,
  StakePoolWithLogo,
  State,
} from './types';

const missingDraftPortfolioErrorMessage = 'DelegationPortfolioState: Inconsistent state: missing draftPortfolio';

export const atomicStateMutators = {
  addPoolsFromPreferences: ({ state }: { state: State }) => {
    if (!state.draftPortfolio) throw new Error(missingDraftPortfolioErrorMessage);
    return {
      activeDrawerStep: undefined,
      activeFlow: Flow.BrowsePools,
      draftPortfolio: undefined,
      selectedPortfolio: state.draftPortfolio,
    } as const;
  },
  beginNewPortfolioCreation: ({ selections }: { selections: DraftPortfolioStakePool[] }) => {
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
      activeDrawerStep: DrawerManagementStep.Preferences,
      activeFlow: Flow.NewPortfolio,
      draftPortfolio: targetDraftPortfolio,
    } as const;
  },
  cancelDrawer: <F extends Flow.Overview | Flow.BrowsePools>({ targetFlow }: { state: State; targetFlow: F }) => ({
    activeDrawerStep: undefined,
    activeFlow: targetFlow,
  }),
  removePoolFromPreferences: ({ id, state }: { id: Wallet.Cardano.PoolIdHex; state: State }) => {
    if (!state.draftPortfolio) throw new Error(missingDraftPortfolioErrorMessage);
    if (state.draftPortfolio.length === 1) return {};
    return {
      draftPortfolio: state.draftPortfolio.filter((pool) => pool.id !== id),
    } as const;
  },
  selectPool: ({ stakePool, state }: { stakePool: Wallet.Cardano.StakePool; state: State }) => {
    const selectionsFull = state.selectedPortfolio.length === MAX_POOLS_COUNT;
    const alreadySelected = state.selectedPortfolio.some(({ id }) => stakePool.hexId === id);
    if (selectionsFull || alreadySelected) return {};
    const newPool = initializeDraftPortfolioPool({ initialPercentage: 0, stakePool, state });

    return {
      // placing new pool at the top of the list for better UX
      selectedPortfolio: [newPool, ...state.selectedPortfolio],
    };
  },
  showChangingPreferencesConfirmation: ({
    pendingSelectedPortfolio,
  }: {
    pendingSelectedPortfolio: DraftPortfolioStakePool[];
  }) =>
    ({
      activeDrawerStep: undefined,
      activeFlow: Flow.ChangingPreferences,
      pendingSelectedPortfolio,
      viewedStakePool: undefined,
    } as const),
  showPoolDetails: <F extends Flow.CurrentPoolDetails | Flow.PoolDetails>({
    pool,
    targetFlow,
  }: {
    pool: StakePoolWithLogo;
    targetFlow: F;
  }) =>
    ({
      activeDrawerStep: DrawerDefaultStep.PoolDetails,
      activeFlow: targetFlow,
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
