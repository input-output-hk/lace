import { Wallet } from '@lace/cardano';
import { Draft, produce } from 'immer';
import create from 'zustand';
import { DelegationPortfolioState, DelegationPortfolioStore } from './types';

const defaultState: DelegationPortfolioState = {
  currentPortfolio: [],
  draftPortfolio: [],
};

export const useDelegationPortfolioStore = create<DelegationPortfolioStore>((set) => ({
  ...defaultState,
  addPoolToDraft: (pool) => set(({ draftPortfolio }) => ({ draftPortfolio: [...draftPortfolio, pool] })),
  clearDraft: () => set(defaultState),
  removePoolFromDraft: ({ poolId }) =>
    set(({ draftPortfolio }) => ({
      draftPortfolio: draftPortfolio.filter((pool) => pool.id !== poolId),
    })),
  setCurrentPortfolio: (rewardAccountInfo, cardanoCoin) => {
    if (!rewardAccountInfo || rewardAccountInfo.length === 0) return;
    const delegatees = rewardAccountInfo.map((r) => r.delegatee).filter(Boolean) as Wallet.Cardano.Delegatee[];
    const stakePools = delegatees
      .map(({ currentEpoch, nextEpoch, nextNextEpoch }) => nextNextEpoch || nextEpoch || currentEpoch)
      .filter(Boolean) as Wallet.Cardano.StakePool[];
    const currentPortfolio = stakePools
      .map((stakePool) => Wallet.util.stakePoolTransformer({ cardanoCoin, stakePool }))
      .map(({ id, name, ticker }) => ({ id, name, ticker, weight: 1 }));
    set({ currentPortfolio });
  },
  updatePoolWeight: ({ poolId, weight }) =>
    set(
      produce((draft: Draft<DelegationPortfolioState>) => {
        const poolEntry = draft.draftPortfolio.find((pool) => pool.id === poolId);
        if (!poolEntry) return;
        poolEntry.weight = weight;
      })
    ),
}));
