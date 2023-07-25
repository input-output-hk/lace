import { Wallet } from '@lace/cardano';
import { Draft, produce } from 'immer';
import create, { StateSelector } from 'zustand';
import { DelegationPortfolioState, DelegationPortfolioStore } from './types';

const defaultState: DelegationPortfolioState = {
  currentPortfolio: [],
  draftPortfolio: [],
};

export const MAX_POOLS_COUNT = 5;

export const useDelegationPortfolioStore = create<DelegationPortfolioStore>((set, get) => ({
  ...defaultState,
  mutators: {
    addPoolToDraft: (poolData) =>
      set(({ draftPortfolio }) => {
        const draftFull = draftPortfolio.length === MAX_POOLS_COUNT;
        const alreadyInDraft = draftPortfolio.some(({ id }) => poolData.id === id);
        return {
          draftPortfolio: draftFull || alreadyInDraft ? draftPortfolio : [...draftPortfolio, poolData],
        };
      }),
    clearDraft: () => set({ draftPortfolio: [] }),
    removePoolFromDraft: ({ id }) =>
      set(({ draftPortfolio }) => ({
        draftPortfolio: draftPortfolio.filter((pool) => pool.id !== id),
      })),
    setCurrentPortfolio: async ({ cardanoCoin, rewardAccountInfo }) => {
      if (!rewardAccountInfo || rewardAccountInfo.length === 0) return;

      const delegatees = rewardAccountInfo
        .map((r) => r.delegatee)
        .filter((item): item is Wallet.Cardano.Delegatee => !!item);
      const stakePools = delegatees
        .map(({ currentEpoch, nextEpoch, nextNextEpoch }) => nextNextEpoch || nextEpoch || currentEpoch)
        .filter((item): item is Wallet.Cardano.StakePool => !!item);

      const currentPortfolio = stakePools.map((stakePool) => ({
        displayData: Wallet.util.stakePoolTransformer({ cardanoCoin, stakePool }),
        id: stakePool.hexId,
        name: stakePool.metadata?.name,
        ticker: stakePool.metadata?.ticker,
        weight: 1,
      }));

      set({ currentPortfolio });
    },
    updatePoolWeight: ({ id, weight }) =>
      set(
        produce((draft: Draft<DelegationPortfolioState>) => {
          const poolEntry = draft.draftPortfolio.find((pool) => pool.id === id);
          if (!poolEntry) return;
          poolEntry.weight = weight;
        })
      ),
  },
  poolIncludedInDraft: (id) => {
    const { draftPortfolio } = get();
    return !!draftPortfolio?.find((pool) => pool.id === id);
  },
}));

export const selectDraftPoolsCount: StateSelector<DelegationPortfolioState, number> = (store) =>
  store.draftPortfolio.length;
