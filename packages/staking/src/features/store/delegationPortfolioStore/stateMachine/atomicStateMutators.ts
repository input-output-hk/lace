import { Wallet } from '@lace/cardano';
import { MAX_POOLS_COUNT, targetWeight } from '../constants';
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

const mapPoolWeights = (pools: DraftPortfolioStakePool[]) =>
  pools.map<DraftPortfolioStakePool>((pool) => ({ ...pool, weight: Math.round(targetWeight / pools.length) }));

export const atomicStateMutators = {
  addPoolsFromPreferences: ({ state }: { state: State }) => {
    if (!state.draftPortfolio) throw new Error(missingDraftPortfolioErrorMessage);
    return {
      activeDrawerStep: undefined,
      activeFlow: Flow.BrowsePools,
      draftPortfolio: undefined,
      selectedPortfolio: mapPoolWeights(state.draftPortfolio),
    } as const;
  },
  beginNewPortfolioCreation: ({ selections }: { selections: DraftPortfolioStakePool[] }) =>
    ({
      activeDrawerStep: DrawerManagementStep.Preferences,
      activeFlow: Flow.NewPortfolio,
      draftPortfolio: selections,
    } as const),
  cancelDrawer: <F extends Flow.Overview | Flow.BrowsePools>({ targetFlow }: { state: State; targetFlow: F }) => ({
    activeDrawerStep: undefined,
    activeFlow: targetFlow,
  }),
  removePoolFromPreferences: ({ id, state }: { id: Wallet.Cardano.PoolIdHex; state: State }) => {
    if (!state.draftPortfolio) throw new Error(missingDraftPortfolioErrorMessage);
    if (state.draftPortfolio.length === 1) return {};
    return {
      draftPortfolio: mapPoolWeights(state.draftPortfolio.filter((pool) => pool.id !== id)),
    } as const;
  },
  selectPool: ({ stakePool, state }: { stakePool: Wallet.Cardano.StakePool; state: State }) => {
    const selectionsFull = state.selectedPortfolio.length === MAX_POOLS_COUNT;
    const alreadySelected = state.selectedPortfolio.some(({ id }) => stakePool.hexId === id);
    if (selectionsFull || alreadySelected) return {};
    return {
      selectedPortfolio: mapPoolWeights([
        ...state.selectedPortfolio,
        mapStakePoolToPortfolioPool({ cardanoCoinSymbol: state.cardanoCoinSymbol, stakePool }),
      ]),
    } as const;
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
      selectedPortfolio: mapPoolWeights(state.selectedPortfolio.filter((pool) => pool.id !== id)),
    } as const),
};
