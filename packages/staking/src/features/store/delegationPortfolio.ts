import { Wallet } from '@lace/cardano';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { DelegationPortfolioState, DelegationPortfolioStore, PortfolioState } from './types';

const defaultState: DelegationPortfolioState = {
  currentPortfolio: [],
  draftPortfolio: [],
  selections: [],
  state: PortfolioState.Free,
};

export const MAX_POOLS_COUNT = 5;

export const useDelegationPortfolioStore = create(
  immer<DelegationPortfolioStore>((set, get) => ({
    ...defaultState,
    mutators: {
      beginProcess: (process) =>
        set((state) => {
          if (state.state === process) return;
          state.state = process;
          state.draftPortfolio =
            process === PortfolioState.ManagingCurrentPortfolio ? state.currentPortfolio : state.selections;
        }),
      cancelProcess: () =>
        set((state) => {
          if (state.state === PortfolioState.Free) return;
          state.draftPortfolio = [];
          state.state = PortfolioState.Free;
        }),
      clearSelections: () =>
        set((store) => {
          store.selections = [];
        }),
      finalizeProcess: () =>
        set((store) => {
          if (store.state === PortfolioState.Free) return;
          store.draftPortfolio = [];
          if (store.state === PortfolioState.ConfirmingNewPortfolio) {
            store.selections = [];
          }
          store.state = PortfolioState.Free;
        }),
      moveFromManagingProcessToSelections: () =>
        set((store) => {
          if (store.state !== PortfolioState.ManagingCurrentPortfolio) return;
          store.selections = store.draftPortfolio;
          store.draftPortfolio = [];
          store.state = PortfolioState.Free;
        }),
      selectPool: (poolData) =>
        set(({ selections }) => {
          const selectionsFull = selections.length === MAX_POOLS_COUNT;
          const alreadySelected = selections.some(({ id }) => poolData.id === id);
          if (selectionsFull || alreadySelected) return;
          selections.push(poolData);
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
      unselectPool: ({ id }) =>
        set((store) => {
          store.selections = store.selections.filter((pool) => pool.id !== id);
        }),
    },
    queries: {
      isPoolAlreadySelected: (id) => {
        const { selections } = get();
        return !!selections?.find((pool) => pool.id === id);
      },
    },
  }))
);
