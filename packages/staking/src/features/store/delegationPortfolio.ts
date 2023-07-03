import { Draft, produce } from 'immer';
import create, { StateSelector } from 'zustand';
import { DelegationPortfolioState, DelegationPortfolioStore } from './types';

const defaultState: DelegationPortfolioState = {
  delegationPortfolioPools: [],
};

export const useDelegationPortfolioStore = create<DelegationPortfolioStore>((set) => ({
  ...defaultState,
  addPoolToPortfolio: (pool) =>
    set(({ delegationPortfolioPools }) => ({ delegationPortfolioPools: [...delegationPortfolioPools, pool] })),
  clearDelegationPortfolio: () => set(defaultState),
  removePoolFromPortfolio: ({ poolId }) =>
    set(({ delegationPortfolioPools }) => ({
      delegationPortfolioPools: delegationPortfolioPools.filter((pool) => pool.id !== poolId),
    })),
  updatePoolWeight: ({ poolId, weight }) =>
    set(
      produce((draft: Draft<DelegationPortfolioState>) => {
        const poolEntry = draft.delegationPortfolioPools.find((pool) => pool.id === poolId);
        if (!poolEntry) return;
        poolEntry.weight = weight;
      })
    ),
}));

export const selectPoolsCount: StateSelector<DelegationPortfolioState, number> = (store) =>
  store.delegationPortfolioPools.length;
