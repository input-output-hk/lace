import { Wallet } from '@lace/cardano';
import { Draft, produce } from 'immer';
import create, { StateSelector } from 'zustand';
import { DelegationPortfolioState, DelegationPortfolioStore } from './types';

const defaultState: DelegationPortfolioState = {
  currentPortfolio: [],
  draftPortfolio: [],
};

export const MAX_POOLS_COUNT = 5;

export const useDelegationPortfolioStore = create<DelegationPortfolioStore>((set) => ({
  ...defaultState,
  mutators: {
    addPoolToDraft: (pool) =>
      set(({ draftPortfolio }) => {
        const draftFull = draftPortfolio.length === MAX_POOLS_COUNT;
        const alreadyInDraft = draftPortfolio.some(({ id }) => pool.id === id);
        return {
          draftPortfolio: draftFull || alreadyInDraft ? draftPortfolio : [...draftPortfolio, pool],
        };
      }),
    clearDraft: () => set({ draftPortfolio: [] }),
    removePoolFromDraft: ({ id }) =>
      set(({ draftPortfolio }) => ({
        draftPortfolio: draftPortfolio.filter((pool) => pool.id !== id),
      })),
    setCurrentPortfolio: (rewardAccountInfo) => {
      if (!rewardAccountInfo || rewardAccountInfo.length === 0) return;
      const delegatees = rewardAccountInfo.map((r) => r.delegatee).filter(Boolean) as Wallet.Cardano.Delegatee[];
      const stakePools = delegatees
        .map(({ currentEpoch, nextEpoch, nextNextEpoch }) => nextNextEpoch || nextEpoch || currentEpoch)
        .filter(Boolean) as Wallet.Cardano.StakePool[];
      const currentPortfolio = stakePools.map(({ hexId, metadata }) => ({
        id: hexId,
        name: metadata?.name,
        ticker: metadata?.ticker,
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
}));

export const selectDraftPoolsCount: StateSelector<DelegationPortfolioState, number> = (store) =>
  store.draftPortfolio.length;
