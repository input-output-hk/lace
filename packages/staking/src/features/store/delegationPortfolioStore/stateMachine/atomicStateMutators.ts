import { Wallet } from '@lace/cardano';
import { MAX_POOLS_COUNT } from '../constants';
import { mapStakePoolToPortfolioPool } from './mapStakePoolToPortfolioPool';
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
    state.activeFlow = Flow.NewPortfolio;
    state.activeDrawerStep = DrawerManagementStep.Preferences;
    state.draftPortfolio = selections;
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
      ...state.selectedPortfolio,
      mapStakePoolToPortfolioPool({ cardanoCoinSymbol: state.cardanoCoinSymbol, stakePool }),
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
};
