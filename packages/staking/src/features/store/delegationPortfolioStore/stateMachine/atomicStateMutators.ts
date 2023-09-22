import { Wallet } from '@lace/cardano';
import { MAX_POOLS_COUNT, targetWeight } from '../constants';
import { mapStakePoolToPortfolioPool } from './mapStakePoolToPortfolioPool';
import {
  DelegationPortfolioState,
  DraftPortfolioStakePool,
  DrawerDefaultStep,
  DrawerManagementStep,
  Flow,
  StakePoolWithLogo,
} from './types';

const missingDraftPortfolioErrorMessage = 'DelegationPortfolioState: Inconsistent state: missing draftPortfolio';

const mapPoolWeights = (pools: DraftPortfolioStakePool[]) =>
  pools.map<DraftPortfolioStakePool>((pool) => ({ ...pool, weight: Math.round(targetWeight / pools.length) }));

export const atomicStateMutators = {
  addPoolsFromPreferences: ({ state }: { state: DelegationPortfolioState }) => {
    if (!state.draftPortfolio) throw new Error(missingDraftPortfolioErrorMessage);
    state.selectedPortfolio = mapPoolWeights(state.draftPortfolio);
    state.draftPortfolio = undefined;
    state.activeFlow = Flow.BrowsePools;
  },
  beginNewPortfolioCreation: ({
    selections,
    state,
  }: {
    selections: DraftPortfolioStakePool[];
    state: DelegationPortfolioState;
  }) => {
    state.activeFlow = Flow.NewPortfolio;
    state.activeDrawerStep = DrawerManagementStep.Preferences;
    state.draftPortfolio = selections;
  },
  cancelDrawer: ({
    state,
    targetFlow,
  }: {
    state: DelegationPortfolioState;
    targetFlow: Flow.Overview | Flow.BrowsePools;
  }) => {
    state.activeFlow = targetFlow;
    state.activeDrawerStep = undefined;
  },
  removePoolFromPreferences: ({ id, state }: { id: Wallet.Cardano.PoolIdHex; state: DelegationPortfolioState }) => {
    if (!state.draftPortfolio) throw new Error(missingDraftPortfolioErrorMessage);
    if (state.draftPortfolio.length === 1) return;
    state.draftPortfolio = mapPoolWeights(state.draftPortfolio.filter((pool) => pool.id !== id));
  },
  selectPool: ({ stakePool, state }: { stakePool: Wallet.Cardano.StakePool; state: DelegationPortfolioState }) => {
    const selectionsFull = state.selectedPortfolio.length === MAX_POOLS_COUNT;
    const alreadySelected = state.selectedPortfolio.some(({ id }) => stakePool.hexId === id);
    if (selectionsFull || alreadySelected) return;
    state.selectedPortfolio.push(
      mapStakePoolToPortfolioPool({ cardanoCoinSymbol: state.cardanoCoinSymbol, stakePool })
    );
    state.selectedPortfolio = mapPoolWeights(state.selectedPortfolio);
  },
  showChangingPreferencesConfirmation: ({
    pendingSelectedPortfolio,
    state,
  }: {
    pendingSelectedPortfolio: DraftPortfolioStakePool[];
    state: DelegationPortfolioState;
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
    state: DelegationPortfolioState;
    targetFlow: Flow.CurrentPoolDetails | Flow.PoolDetails;
  }) => {
    state.activeFlow = targetFlow;
    state.activeDrawerStep = DrawerDefaultStep.PoolDetails;
    state.viewedStakePool = pool;
  },
  unselectPool: ({ id, state }: { id: Wallet.Cardano.PoolIdHex; state: DelegationPortfolioState }) => {
    state.selectedPortfolio = mapPoolWeights(state.selectedPortfolio.filter((pool) => pool.id !== id));
  },
};
