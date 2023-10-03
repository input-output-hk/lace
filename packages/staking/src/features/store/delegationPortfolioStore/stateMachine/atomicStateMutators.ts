import { Wallet } from '@lace/cardano';
import { MAX_POOLS_COUNT, PERCENTAGE_SCALE_MAX } from '../constants';
import { mapStakePoolToPortfolioPool } from './mapStakePoolToPortfolioPool';
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

const ejectDraftFromCurrentPortfolio = (
  pools: DraftPortfolioStakePool[]
): (DraftPortfolioStakePool & { basedOnCurrentPortfolio: false })[] =>
  pools.map((pool) => ({ ...pool, basedOnCurrentPortfolio: false }));

export const atomicStateMutators = {
  addPoolsFromPreferences: ({ state }: { state: State }) => {
    if (!state.draftPortfolio) throw new Error(missingDraftPortfolioErrorMessage);
    state.selectedPortfolio = ejectDraftFromCurrentPortfolio(state.draftPortfolio);
    state.draftPortfolio = undefined;
    state.activeFlow = Flow.BrowsePools;
  },
  beginNewPortfolioCreation: ({ selections, state }: { selections: DraftPortfolioStakePool[]; state: State }) => {
    // RESPONSIBLITY: If all new pools have 0 percentages (just added pools), rebalance equally
    state.activeFlow = Flow.NewPortfolio;
    state.activeDrawerStep = DrawerManagementStep.Preferences;
    const allPoolsHaveZeroPercentages = selections.every(
      ({ sliderIntegerPercentage }) => sliderIntegerPercentage === 0
    );
    if (allPoolsHaveZeroPercentages) {
      const percentageValue = PERCENTAGE_SCALE_MAX / selections.length; // may be float
      state.draftPortfolio = selections.map((pool) => ({
        ...pool,
        sliderIntegerPercentage: percentageValue,
      }));
      state.draftPortfolio = normalizePercentages(state.draftPortfolio, 'sliderIntegerPercentage');
    } else {
      state.draftPortfolio = selections;
    }
  },
  cancelDrawer: ({ state, targetFlow }: { state: State; targetFlow: Flow.Overview | Flow.BrowsePools }) => {
    state.activeFlow = targetFlow;
    state.activeDrawerStep = undefined;
  },
  removePoolFromPreferences: ({ id, state }: { id: Wallet.Cardano.PoolIdHex; state: State }) => {
    if (!state.draftPortfolio) throw new Error(missingDraftPortfolioErrorMessage);
    if (state.draftPortfolio.length === 1) return;
    state.draftPortfolio = ejectDraftFromCurrentPortfolio(state.draftPortfolio.filter((pool) => pool.id !== id));
  },
  selectPool: ({ stakePool, state }: { stakePool: Wallet.Cardano.StakePool; state: State }) => {
    const selectionsFull = state.selectedPortfolio.length === MAX_POOLS_COUNT;
    const alreadySelected = state.selectedPortfolio.some(({ id }) => stakePool.hexId === id);
    if (selectionsFull || alreadySelected) return;
    state.selectedPortfolio = ejectDraftFromCurrentPortfolio([
      {
        ...mapStakePoolToPortfolioPool({
          cardanoCoinSymbol: state.cardanoCoinSymbol,
          sliderIntegerPercentage: 0,
          stakePool,
        }),
      },
      ...state.selectedPortfolio,
    ]);
  },
  showChangingPreferencesConfirmation: ({
    pendingSelectedPortfolio,
    state,
  }: {
    pendingSelectedPortfolio: DraftPortfolioStakePool[];
    state: State;
  }) => {
    state.activeFlow = Flow.ChangingPreferences;
    state.pendingSelectedPortfolio = pendingSelectedPortfolio;
    state.activeDrawerStep = undefined;
    state.viewedStakePool = undefined;
  },
  showPoolDetails: ({
    pool,
    state,
    targetFlow,
  }: {
    pool: StakePoolWithLogo;
    state: State;
    targetFlow: Flow.CurrentPoolDetails | Flow.PoolDetails;
  }) => {
    state.activeFlow = targetFlow;
    state.activeDrawerStep = DrawerDefaultStep.PoolDetails;
    state.viewedStakePool = pool;
  },
  unselectPool: ({ id, state }: { id: Wallet.Cardano.PoolIdHex; state: State }) => {
    state.selectedPortfolio = ejectDraftFromCurrentPortfolio(state.selectedPortfolio.filter((pool) => pool.id !== id));
  },
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
    state.draftPortfolio = ejectDraftFromCurrentPortfolio(
      state.draftPortfolio.map((pool) =>
        pool.id === id ? { ...pool, sliderIntegerPercentage: newSliderPercentage } : pool
      )
    );
  },
};
