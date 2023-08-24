import { Wallet } from '@lace/cardano';
import { StateSelector, create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { DelegationPortfolioState, DelegationPortfolioStore } from './types';

const defaultState: DelegationPortfolioState = {
  currentPortfolio: [],
  draftPortfolio: [],
};

export const MAX_POOLS_COUNT = 5;

export const useDelegationPortfolioStore = create(
  immer<DelegationPortfolioStore>((set, get) => ({
    ...defaultState,
    ableToAddMorePools: () => {
      const { draftPortfolio } = get();
      return draftPortfolio.length < MAX_POOLS_COUNT;
    },
    mutators: {
      addPoolToDraft: (poolData) =>
        set(({ draftPortfolio }) => {
          const { ableToAddMorePools } = get();
          const alreadyInDraft = draftPortfolio.some(({ id }) => poolData.id === id);
          if (!ableToAddMorePools() || alreadyInDraft) return;
          draftPortfolio.push(poolData);
        }),
      clearDraft: () =>
        set((store) => {
          store.draftPortfolio = [];
        }),
      removePoolFromDraft: ({ id }) =>
        set((store) => {
          store.draftPortfolio = store.draftPortfolio.filter((pool) => pool.id !== id);
        }),
      setCurrentPortfolio: async ({ cardanoCoin, delegationDistribution }) => {
        const currentPortfolio = delegationDistribution.map(({ pool: stakePool, percentage, stake }) => ({
          displayData: Wallet.util.stakePoolTransformer({ cardanoCoin, stakePool }),
          id: stakePool.hexId,
          name: stakePool.metadata?.name,
          stakePool,
          ticker: stakePool.metadata?.ticker,
          value: stake,
          weight: percentage,
        }));

        set((store) => {
          store.currentPortfolio = currentPortfolio;
        });
      },
      updatePoolWeight: ({ id, weight }) =>
        set((store) => {
          const poolEntry = store.draftPortfolio.find((pool) => pool.id === id);
          if (!poolEntry) return;
          poolEntry.weight = weight;
        }),
    },
    poolIncludedInDraft: (id) => {
      const { draftPortfolio } = get();
      return !!draftPortfolio?.find((pool) => pool.id === id);
    },
  }))
);

export const selectDraftPoolsCount: StateSelector<DelegationPortfolioState, number> = (store) =>
  store.draftPortfolio.length;
