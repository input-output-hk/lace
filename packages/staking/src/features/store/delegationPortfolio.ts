import { Draft, produce } from 'immer';
import create from 'zustand';
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
        const poolIndex = draft.delegationPortfolioPools.findIndex((pool) => pool.id === poolId);
        if (poolIndex === -1) return;
        draft.delegationPortfolioPools[poolIndex]!.weight = weight;
      })
    ),
}));
