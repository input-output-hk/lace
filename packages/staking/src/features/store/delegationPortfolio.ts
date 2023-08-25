import { Wallet } from '@lace/cardano';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { DelegationPortfolioState, DelegationPortfolioStore, PortfolioManagementProcess } from './types';

const defaultState: DelegationPortfolioState = {
  activeManagementProcess: PortfolioManagementProcess.None,
  currentPortfolio: [],
  draftPortfolio: [],
  selections: [],
};

export const MAX_POOLS_COUNT = 5;

export const useDelegationPortfolioStore = create(
  immer<DelegationPortfolioStore>((set, get) => ({
    ...defaultState,
    mutators: {
      beginManagementProcess: (process) =>
        set((store) => {
          if (store.activeManagementProcess === process) return;
          store.activeManagementProcess = process;
          store.draftPortfolio =
            process === PortfolioManagementProcess.CurrentPortfolio ? store.currentPortfolio : store.selections;
        }),
      // eslint-disable-next-line unicorn/no-object-as-default-parameter
      cancelManagementProcess: ({ dumpDraftToSelections } = { dumpDraftToSelections: false }) =>
        set((store) => {
          if (store.activeManagementProcess === PortfolioManagementProcess.None) return;
          if (dumpDraftToSelections) {
            store.selections = store.draftPortfolio.map((pool) => ({
              ...pool,
              weight: 1,
            }));
          }
          store.draftPortfolio = [];
          store.activeManagementProcess = PortfolioManagementProcess.None;
        }),
      clearSelections: () =>
        set((store) => {
          store.selections = [];
        }),
      finalizeManagementProcess: () =>
        set((store) => {
          if (store.activeManagementProcess === PortfolioManagementProcess.None) return;
          store.draftPortfolio = [];
          if (store.activeManagementProcess === PortfolioManagementProcess.NewPortfolio) {
            store.selections = [];
          }
          store.activeManagementProcess = PortfolioManagementProcess.None;
        }),
      removePoolInManagementProcess: ({ id }) =>
        set((store) => {
          if (store.activeManagementProcess === PortfolioManagementProcess.None) return;
          store.draftPortfolio = store.draftPortfolio.filter((pool) => pool.id !== id);
          if (store.activeManagementProcess === PortfolioManagementProcess.NewPortfolio) {
            store.selections = store.draftPortfolio;
          }
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
      isPoolSelected: (hexId) => {
        const { selections } = get();
        return !!selections?.find((pool) => pool.id === hexId);
      },
    },
  }))
);
